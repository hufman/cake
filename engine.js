(function (root, factory) {
	/** UMD returnExports */
	if (typeof define === 'function' && define.amd) {
		// AMD
		define([], factory);
	} else if (typeof exports === 'object') {
		// nodejs
		module.exports = factory();
	} else {
		root.cakeengine = factory()
	}
}(this, function () {
	"use strict";
	if (typeof(console) === 'undefined') {
		console = {
			log: function(){},
			debug: function(){}
		}
	}

	var seekForwardTime = 5000;
	var seekBackwardTime = 5000;

	var startTime = 0;		// the timestamp that has the "start" of playback (now - curtime), in MS
	var curTime = 0;		// where in the song we currently are
	var paused = true;			// Whether playback is paused or not
	var waitingForMusic = true;

	var TimedEvent = function (startTime) {
		this.startTime = startTime;
	};
	TimedEvent.prototype.run = function () {
	};
	TimedEvent.prototype.undo = function() {
	};

	var Timeline = function () {
		this.events = [];
		this.index = -1;
	};
	var timelines = {};		// independent series of events, with independent keyframes
	var timers = [];		// active timers that should be killed on pause
	var seekListeners = [];		// any callbacks for general seek events
	var playListeners = [];		// any callbacks for general play events
	var pauseListeners = [];	// any callbacks for general pause events
	var player = null;
	var songname = null;

	var init = function (cursong) {
		songname = cursong;
		initMusicPlayer();

		attachKeyInput(document);

		startTime = new Date().getTime();
	};
	var initMusicPlayer = function () {
		console.log("Initializing music");
		player = document.createElement('audio');
		if(player && player.canPlayType) {
			var canplayogg = player.canPlayType('audio/ogg');
			var canplaymp3 = player.canPlayType('audio/mp3');
			if (canplayogg == 'probably') {
				player.setAttribute('src', songname+'.ogg');
			}
			else if (canplaymp3 == 'probably') {
				player.setAttribute('src', songname+'.mp3');
			}
			else if (canplayogg == 'maybe') {
				player.setAttribute('src', songname+'.ogg');
			}
			else if (canplaymp3 == 'maybe') {
				player.setAttribute('src', songname+'.mp3');
			}
			else {
				console.log("Browser doesn't support Vorbis Audio or Mp3! canplayogg:"+canplayogg+" canplaymp3:"+canplaymp3);
				player = null;
				return;
			}

			console.log("Loading song "+player.getAttribute('src'));
			waitingForMusic = true;
			player.setAttribute('preload', 'auto');
			player.addEventListener("playing", musicStarted, false);
		}
		else {
			player = null;
		}
	};

	var attachKeyInput = function (element) {
		var onkeydown = function (e) {
			var evtobj = window.event ? e : e;
			var key = evtobj.keyCode ? evtobj.keyCode : evtobj.charCode;
			var handled = false;

			if (key == 32) {		// space
				if (paused) {
					play();
				}
				else {
					pause();
				}
				handled = true;
			}
			if (key == 39) {		// right arrow
				seek(seekForwardTime);
				handled = true;
			}
			if (key == 37) {		// left arrow
				seek(-seekBackwardTime);
				handled = true;
			}

			if (handled == true){ 		// a valid key was pressed
				(arguments[0].preventDefault) ? arguments[0].preventDefault() : arguments[0].returnValue = false;
			}
			return handled == false;	// whether to bubble to next handler
		}

		if (element.attachEvent)
			element.attachEvent('onkeydown', onkeydown);
		else if (element.addEventListener)
			element.addEventListener('keydown', onkeydown, false);
	};

	/*
	Returns how many ms into the song we are
	*/
	var getCurTime = function () {
		return new Date().getTime() - startTime;
	};

	/*
	Set the playback to play
	*/
	var play = function() {
		if (paused) {
			if (player) {
				//console.log("Fixing starttime by "+(startTime - (new Date().getTime()-curTime)));
				curTime = player.currentTime * 1000;
				player.play();
			}
			else {
			}
			startTime = new Date().getTime() - curTime;
			paused = false;

			scheduleNextEvent();

			timers['sync'] = setTimeout(sync, 20);

			for (var lindex = 0; lindex < playListeners.length; lindex++) {
				var listener = playListeners[lindex];
				listener(curTime);
			}
		}
	};

	/*
	Set the playback to paused
	*/
	var pause = function () {
		if (!paused) {
			paused = true;
			if (player) {
				player.pause();
				curTime = player.currentTime*1000;
			}
			else {
				curTime = getCurTime();
			}

			for (var timer in timers) {
				clearTimeout(timers[timer]);
			}

			for (var lindex = 0; lindex < pauseListeners.length; lindex++) {
				var listener = pauseListeners[lindex];
				listener(curTime);
			}
		}
	};

	/*
	Whether playback is currently paused
	*/
	var isPaused = function () {
		return paused
	};

	/*
	Pause the playback, run the provided function, and unpause
	This guarantees that curTime is correct
	*/
	var lockpause = function (func) {
		var wasPaused = paused;
		pause();
		func()
		if (wasPaused) {
			play();
		}
	};

	/*
	Seeks this many ms into the song, or backwards if negative
	*/
	var seek = function(distance) {
		lockpause(function() {
			var newtime;
			newtime = curTime + distance;
			seekTo(newtime);
		});
	};

	/*
	Seeks to this ms in the song
	*/
	var seekTo = function(time) {
		lockpause(function() {
			time = Math.max(0, time);
			if (player) {
				time = Math.min(time, (player.duration - 0.5)*1000.0);
				player.currentTime = time/1000.0;
			}
			var distance = time - curTime;
			curTime = time;
			startTime = new Date().getTime() - curTime;

			seekEvents(distance, curTime);
			for (var lindex = 0; lindex < seekListeners.length; lindex++) {
				var listener = seekListeners[lindex];
				listener(distance, curTime);
			}
		});
	};

	var seekEvents = function (distance, curTime) {
		var timeline = null;
		for (var timelineName in timelines) {
			timeline = timelines[timelineName];
			seekTimeline(distance, curTime, timeline);
		}
	};

	var seekTimeline = function (distance, curTime, timeline) {
		while (timeline.events[timeline.index] &&
		       timeline.events[timeline.index].startTime>curTime) {
			timeline.events[timeline.index].undo();
			timeline.index--;
		}
		while (timeline.events[timeline.index+1] &&
		       timeline.events[timeline.index+1].startTime<curTime) {
			timeline.events[timeline.index+1].run();
			timeline.index++
		}
	};

	var sync = function()
	{
		if (player && !paused) {
			//console.log("Curtime difference: "+(curTime - (player.currentTime*1000)));
			curTime = player.currentTime * 1000;
			startTime = new Date().getTime() - curTime;

			timers['sync'] = setTimeout(sync, 100);
		}
	};

	var musicStarted = function () {
		if (waitingForMusic) {
			console.log("Music ready");
			play();
			waitingForMusic = false;
		}
	};

	var addEvent = function(timelineName, event) {
		if (typeof event.startTime === 'undefined') {
			console.log("New event for "+timelineName+" is missing startTime", event);
			return;
		}
		if (!timelines.hasOwnProperty(timelineName)) {
			timelines[timelineName] = new Timeline();
		}
		var timeline = timelines[timelineName];
		if (timeline.events.length == 0) {
			timeline.events.push(event);
		} else if (event.startTime < timeline.events[0].startTime) {
			timeline.events.unshift(event);
		} else if (timeline.events[timeline.events.length-1].startTime <= event.startTime) {
			timeline.events.push(event);
		} else {
			var start = 0;
			var end = timeline.events.length - 1;
			var splicePoint = timeline.events.length / 2;
			while (end - start > 1) {
				var cur = timeline.events[splicePoint];
				if (event.startTime < cur.startTime) {
					end = splicePoint;
				} else if (cur.startTime <= event.startTime) {
					start = splicePoint;
				}
			}
			// start is pointing to an event before the inserted event
			// end is pointing to an event after the inserted event
			splicePoint = start + 1;
			timeline.events.splice(splicePoint, 0, event);
			if (splicePoint < timeline.index) {
				timeline.index++;
			}
		}
	};

	/*
	Adds a callback to be called when a seek occurs
	The callback will receive the following parameters:
		distance: the length, in milliseconds, of the seek, negative for backwards
		position: the new position, in milliseconds, of the playback
	*/
	var addSeekListener = function(callback) {
		seekListeners.push(callback);
	};
	/*
	Adds a callback to be called when playback starts
	The callback will receive the following parameters:
		position: the current position, in milliseconds, of the playback
	*/
	var addPlayListener = function(callback) {
		playListeners.push(callback);
	};
	/*
	Adds a callback to be called when playback pauses
	The callback will receive the following parameters:
		position: the current position, in milliseconds, of the playback
	*/
	var addPauseListener = function(callback) {
		pauseListeners.push(callback);
	};

	var scheduleNextEvent = function () {
		if (paused) {
			// startTime is old
			return;
		}
		var timeline = null;
		var nextevent = null;
		var curevent = null;
		var nexttimeline = null;
		var nextindex = null;
		for (var timelineName in timelines) {
			timeline = timelines[timelineName];
			curevent = timeline.events[timeline.index+1];
			if (nextevent == null) {
				nextevent = curevent;
				nexttimeline = timelineName;
				nextindex = timeline.index+1;
			} else {
				if (curevent.startTime < nextevent.startTime) {
					nextevent = curevent;
					nexttimeline = timelineName;
					nextindex = timeline.index+1;
				}
			}
		}
		curTime = new Date().getTime() - startTime;
		if (nextevent) {
			var delay = nextevent.startTime-curTime;
			console.log("Scheduling " + nexttimeline + " event "+(nextindex)+" for "+delay);
			timers['events'] = setTimeout(runEvent, delay);
		} else {
			console.log("End of events");
		}
	};

	var runEvent = function() {
		var timeline = null;
		var nextevent = null;
		var nexttimeline = null;
		for (var timelineName in timelines) {
			timeline = timelines[timelineName];
			nextevent = timeline.events[timeline.index+1];
			curTime = new Date().getTime() - startTime;
			while (!paused && nextevent && nextevent.startTime <= curTime) {
				console.log("Running event "+(timeline.index+1));
				timeline.index++;
				nextevent.run();
				nextevent = timeline.events[timeline.index+1];
			}
		}
		scheduleNextEvent();
	}

	return {
		TimedEvent: TimedEvent,
		init: init,
		addEvent: addEvent,
		onSeek: addSeekListener,
		onPlay: addPlayListener,
		onPause: addPauseListener,
		play: play,
		pause: pause,
		isPaused: isPaused,
		seek: seek,
		seekTo: seekTo
	};
}));


//window.addEventListener("load", init, 0);
