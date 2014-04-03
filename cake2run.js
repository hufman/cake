var cake2 = {
	init: function () {
		cake2.lyricsdiv = document.getElementById('lyricstext');
		cake2.creditsdiv = document.getElementById('creditstext');

		cake2.engine = window.cakeengine;
		cake2.engine.init(data.song);
		cake2.animationData = {
			last: 0,
			left: 0,
			right: 50,
			scanline: -200,
			timer: null
		}

		cake2.initCredits();

		cake2.initLyrics();

		cake2.initBlinker();

		cake2.initAnimations();

		cake2.engine.play();
	},

	initBlinker: function () {
		if (!cake2.lyricsBlinker)
		{
			cake2.lyricsBlinker = document.createElement("span");
			cake2.lyricsdiv.appendChild(cake2.lyricsBlinker);
			cake2.blink(cake2.lyricsBlinker);
		}
		if (!cake2.creditsBlinker)
		{
			var linediv = document.createElement("div");
			linediv.innerHTML="&nbsp;";
			cake2.creditsBlinker = document.createElement("span");
			cake2.creditsBlinker.id="creditsBlinker";
			linediv.insertBefore(cake2.creditsBlinker, linediv.childNodes[0]);
			cake2.creditsdiv.appendChild(linediv);
			cake2.blink(cake2.creditsBlinker);
		}
	},

	blink: function (blinker) {
		nextChar = blinker.innerHTML;
		var newChar = '_';
		if (nextChar == '_')
			newChar = '&nbsp;';
		if (nextChar == '&nbsp;')
			newChar = '_';
		if (!cake2.engine.isPaused())
			blinker.innerHTML = newChar;

		setTimeout(function () {
			cake2.blink(blinker)
		}, data.blinkerTime);

	},

	initLyrics: function () {

		var NewLetter = function (starttime, parentelement, letter) {
			this.startTime = starttime;
			this.parentelement = parentelement;
			this.letter = letter;
			this.ran = 0;
		};
		NewLetter.prototype.run = function () {
			if (this.ran)
				this.ran = this.ran + 0;
			this.oldlength = this.parentelement.innerHTML.length;
			this.parentelement.innerHTML = this.parentelement.innerHTML+this.letter;
			this.ran = 1;
		};
		NewLetter.prototype.undo = function () {
			this.parentelement.innerHTML = this.parentelement.innerHTML.substring(0,this.oldlength);
		};

		var NewPage = function (starttime, parentelement) {
			this.startTime = starttime;
			this.parentelement = parentelement;
			this.prevpage = '';
		};
		NewPage.prototype.run = function () {
			this.prevpage = this.parentelement.innerHTML;
			this.parentelement.innerHTML = '';
		};
		NewPage.prototype.undo = function () {
			this.parentelement.innerHTML = this.prevpage;
		};

		var pictureDiv = document.getElementById('picturetext');

		var lyricsSpan = document.createElement('span');
		cake2.lyricsdiv.appendChild(lyricsSpan);

		var curtime = data.lyricsDelay;

		var firstpage = new NewPage(curtime,lyricsSpan);
		cake2.engine.addEvent('lyrics', firstpage);
		for (var index = 0; index<lyrics.length; index++)
		{
			var lyric = lyrics[index];
			var line = lyric.text;
			var delay = lyric.delay*1000;

			for (var lindex = 0; lindex<line.length; lindex++)
			{
				//if (index==0 && lindex==0) alert(line.length);
				var char = line.substring(lindex,lindex+1);
				var event = new NewLetter(curtime+lindex/line.length*delay, lyricsSpan, char);
				cake2.engine.addEvent('lyrics', event);
			}
			curtime += delay;
			if (lyric.newline)
			{
				var event = new NewLetter(curtime,lyricsSpan, '<br />');
				cake2.engine.addEvent('lyrics', event);
			}
			if (lyric.clear)
			{
				var event = new NewPage(curtime,lyricsSpan);
				cake2.engine.addEvent('lyrics', event);
			}
		}
	},

	initCredits: function () {
		var BeginningSeekBlinker = function (starttime, parentelement) {
			// when seeking backwards through the credits,
			// this event will re-add the blinker
			this.startTime = starttime;
			this.parentelement = parentelement;
		};
		BeginningSeekBlinker.prototype.run = function () {};
		BeginningSeekBlinker.prototype.undo = function () {
			var lastline = this.parentelement.childNodes[this.parentelement.childNodes.length-1];
			lastline.insertBefore(cake2.creditsBlinker, lastline.childNodes[0]);
		};

		var NewLine = function (starttime, parentelement, text) {
			this.startTime = starttime;
			this.parentelement = parentelement;
			this.text = text;
			this.selfline = document.createElement('div');
		};
		NewLine.prototype.run = function () {
			this.pushedline = this.parentelement.childNodes[0];
			this.parentelement.removeChild(this.pushedline);
			while (this.selfline.childNodes.length>0)
				this.selfline.removeChild(this.selfline.childNodes[0]);
			this.realline = document.createElement('span');
			this.invisibleline = document.createElement('span');
			this.invisibleline.className='invisible';
			var text = this.text.replace(' ','&nbsp;');
			this.invisibleline.innerHTML = text;
			this.selfline.appendChild(this.realline);
			this.selfline.appendChild(cake2.creditsBlinker);
			this.selfline.appendChild(this.invisibleline);
			this.parentelement.appendChild(this.selfline);
		};
		NewLine.prototype.undo = function () {
			this.parentelement.removeChild(this.selfline);
			this.parentelement.insertBefore(this.pushedline, this.parentelement.childNodes[0]);
		};
		NewLine.prototype.getLine = function () {
			return this.selfline;
		};

		var NextLetter = function (starttime, line) {
			this.startTime = starttime;
			this.line = line;
		};
		NextLetter.prototype.run = function () {
			var vis = this.line.childNodes[0];
			var invis = this.line.childNodes[2];
			this.letter = invis.innerHTML.substring(0,1);
			if (this.letter=='&')
			{
				var next = invis.innerHTML.indexOf(';') + 1;
				this.letter = invis.innerHTML.substring(0, next);
			}
			invis.innerHTML = invis.innerHTML.substring(this.letter.length);
			vis.innerHTML += this.letter;
		};
		NextLetter.prototype.undo = function () {
			var vis = this.line.childNodes[0];
			var invis = this.line.childNodes[2];
			invis.innerHTML = this.letter + invis.innerHTML;
			vis.innerHTML = vis.innerHTML.substring(0, vis.innerHTML.length-this.letter.length);
		};

		var FinishLine = function (starttime, line) {
			this.startTime = starttime;
			this.line = line;
		};
		FinishLine.prototype.run = function () {
			var vis = this.line.childNodes[0];
			var blinker = this.line.childNodes[1];
			var invis = this.line.childNodes[2];

			this.line.removeChild(blinker);

			var gap = document.createElement('span');
			gap.innerHTML='&nbsp;';
			this.line.insertBefore(gap,invis);
		};
		FinishLine.prototype.undo = function () {
			var vis = this.line.childNodes[0];
			var blinker = this.line.childNodes[1];
			var invis = this.line.childNodes[2];

			this.line.removeChild(blinker);

			this.line.insertBefore(cake2.creditsBlinker,invis);
		};

		for (var i = 0; i<data.maxCredits; i++)
		{
			var blank = document.createElement('div');
			blank.innerHTML='&nbsp;';
			cake2.creditsdiv.appendChild(blank);
		}

		var starttime = data.creditsStartTime*1000;

		var totalchars = 0;
		for (var index = 0; index<credits.length; index++)
		{
			totalchars += credits[index].length + 1;
		}
		var perchardelay = data.creditsMaxTime*1000/totalchars;

		var curchar = 0;
		cake2.engine.addEvent('credits', new BeginningSeekBlinker(starttime, cake2.creditsdiv));
		for (var index = 0; index<credits.length; index++)
		{
			var temp = new NewLine(starttime+perchardelay*curchar, cake2.creditsdiv, credits[index]);
			cake2.engine.addEvent('credits', temp);
			var linediv = temp.getLine();
			for (var lindex = 0; lindex<credits[index].length; lindex++)
			{
				var temp = new NextLetter(starttime+perchardelay*curchar, linediv);
				cake2.engine.addEvent('credits', temp);
				curchar++;
			}
			var temp = new FinishLine(starttime+perchardelay*curchar, linediv);
			cake2.engine.addEvent('credits', temp);
			curchar++;
		}
	},

	initAnimations: function () {
		cake2.engine.onPlay(cake2.runAnimations);
		cake2.engine.onSeek(cake2.seekAnimations);
		cake2.engine.onPause(cake2.pauseAnimations);
	},

	runAnimations: function (position) {
		cake2.animationData.last = new Date().getTime();
		cake2.processAnimations();
	},
	pauseAnimations: function (position) {
		clearTimeout(cake2.animationData.timer);
	},

	animationDistance: function(timedistance, settings) {
		var percent = timedistance / settings.repeat;
		return percent * settings.size;
	},
	leftScrollySettings: {
		size: 201,
		repeat: 3000
	},
	rightScrollySettings: {
		size: 201,
		repeat: 3000
	},
	scanlineSettings: {
		size: 400,
		repeat: 1000
	},

	processAnimations: function() {

		var curtime = new Date().getTime();

		// leftscrolly
		var leftscrolly = document.getElementById('leftscrollybox');
		var leftscrollyY = cake2.animationDistance(curtime-cake2.animationData.last, cake2.leftScrollySettings);
		cake2.animationData.left += leftscrollyY;
		cake2.animationData.left %= cake2.leftScrollySettings.size;
		leftscrolly.style.backgroundPosition = "0 " + cake2.animationData.left + "px";

		// rightscrolly
		var rightscrolly = document.getElementById('rightscrollybox');
		var rightscrollyY = cake2.animationDistance(curtime-cake2.animationData.last, cake2.rightScrollySettings);
		cake2.animationData.right -= rightscrollyY;
		cake2.animationData.right %= cake2.rightScrollySettings.size;
		rightscrolly.style.backgroundPosition = "0 " + cake2.animationData.right + "px";

		// scanline
		var scanline = document.getElementById('scanline');
		var scanscroll = cake2.animationDistance(curtime-cake2.animationData.last, cake2.scanlineSettings)
		cake2.animationData.scanline += scanscroll;
		if (cake2.animationData.scanline > document.getElementById('background').offsetHeight + 50)
			cake2.animationData.scanline = -150;
		scanline.style.top = cake2.animationData.scanline + "px";

		cake2.animationData.last = new Date().getTime();
		cake2.animationData.timer = setTimeout(cake2.processAnimations, 20);
	},

	seekAnimations: function(distance, position) {
		cake2.animationData.left += distance*10;
		cake2.animationData.right -= distance*10;

		var height = document.getElementById('background').offsetHeight + 200;
		cake2.animationData.scanline += cake2.animationDistance(distance, cake2.scanlineSettings);
		while (cake2.animationData.scanline < -100) {
			cake2.animationData.scanline += height;
		}
		while (cake2.animationData.scanline > height - 100) {
			cake2.animationData.scanline -= height;
		}
	}

};

window.onLoad = setTimeout(function () {
	cake2.init();
}, 1);
