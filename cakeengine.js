function log(str)
{
	if (typeof(console)!='undefined' && console.log)
		console.log(str);
}
var cake = {
	seekForwardTime:1000,
	seekBackwardTime:1000,
	
	delayMultiplier:1000,
 
	creditsEvents:[],
	creditsEvent:-1,

	firstLyricsIndex:0,
	lastCreditsIndex:0,
	
	startTime:0,		// the timestamp that has the "start" of playback (now - curtime), in MS
	curTime:0,		// where in the song we currently are
	paused:1,			// Whether playback is paused or not
	
	lyricsPages:[],		// all of the pages for the song
	
	lyricsPage:0,		// which page is currently being displayed
	lyricsEvent:-1,		// which event just finished
	
	timers:[],			// active timers that should be killed on pause
	
	animationData: {
		last:0,
		left:0,
		right:50,
		scanline:-400
	},	
	
	init: function()
	{
		cake.lyricsdiv=document.getElementById('lyricstext');
		cake.creditsdiv=document.getElementById('creditstext');

		cake.initCredits();
		
		cake.initLyrics();
		
		cake.initBlinker();
		
		cake.initMusicPlayer();
		
		cake.initKeyInput();
		
		//cake.processCreditLines();
		
		cake.startTime=new Date().getTime();
		if (!cake.player)
			cake.play();
		else
			cake.player.play();
	},
	initMusicPlayer: function()
	{
		cake.player=document.createElement('audio');
		if(cake.player && cake.player.canPlayType)
		{
			var canplayogg=cake.player.canPlayType('audio/ogg');
			var canplaymp3=cake.player.canPlayType('audio/mp3');
			if (canplayogg=='probably')
			{
				cake.player.setAttribute('src',data.song+'.ogg');
			}
			else if (canplaymp3=='probably')
			{
				cake.player.setAttribute('src',data.song+'.mp3');
			}
			else if (canplayogg=='maybe')
			{
				cake.player.setAttribute('src',data.song+'.ogg');
			}
			else if (canplaymp3=='maybe')
			{
				cake.player.setAttribute('src',data.song+'.mp3');
			}
			else {
				log("Browser doesn't support Vorbis Audio or Mp3! canplayogg:"+canplayogg+" canplaymp3:"+canplaymp3);
				cake.player=null;
				return;
			}
			
			cake.player.setAttribute('preload', 'auto');
			cake.player.addEventListener("playing", cake.musicStarted, false);
		}
		else
		{
			cake.player=null;
		}
	},
	
	drawLyricsBorder: function()
	{
		var verttext='';
		for (x=0; x<30; x++)
		{
			verttext+='|<br />';
		}
		var horiztext='';
		for (x=0; x<47; x++)
		{
			horiztext+='-';
		}
		var left=document.getElementById('lyricsleft');
		left.innerHTML=verttext;

		var top=document.getElementById('lyricstop');
		top.innerHTML=horiztext;
		
		var right=document.getElementById('lyricsright');
		right.innerHTML=verttext;
		
		var bottom=document.getElementById('lyricsbottom');
		bottom.innerHTML=horiztext;
		
	},
	drawCreditsBorder: function()
	{
		var verttext='';
		for (x=0; x<16; x++)
		{
			verttext+='|<br />';
		}
		var horiztext='';
		for (x=0; x<47; x++)
		{
			horiztext+='-';
		}
		
		var left=document.getElementById('creditsleft');
		left.innerHTML=verttext;

		var top=document.getElementById('creditstop');
		top.innerHTML=horiztext;
	
		var right=document.getElementById('creditsright');
		right.innerHTML=verttext;

		var bottom=document.getElementById('creditsbottom');
		bottom.innerHTML=horiztext;
	},
	
	initBlinker: function()
	{
		if (!cake.lyricsBlinker)
		{
			cake.lyricsBlinker=document.createElement("span");
			cake.lyricsdiv.appendChild(cake.lyricsBlinker);
			cake.blink(cake.lyricsBlinker);
		}
		if (!cake.creditsBlinker)
		{
			cake.creditsBlinker=document.createElement("span");
			cake.creditsBlinker.id="creditsBlinker";
			cake.creditsdiv.appendChild(cake.creditsBlinker);
			cake.blink(cake.creditsBlinker);
		}
	},
	
	initKeyInput: function()
	{
		var onkeydown=function(e) 
		{
			var evtobj=window.event ? e : e;
			var key=evtobj.keyCode ? evtobj.keyCode : evtobj.charCode;
			var ret=true;
			
			if (key==32)		// space
			{
				if (cake.paused)
				{
					cake.play();
				}
				else
				{
					cake.pause();
				}
				ret = false;
			}
			if (key==39)		// right arrow
			{
				cake.seek(cake.seekForwardTime);
				ret = false;
			}
			if (key==37)		// left arrow
			{
				if (cake.lyricsPage>=cake.lyricsPages.length)
					cake.seek(-cake.seekBackwardTime*5);
				else
					cake.seek(-cake.seekBackwardTime);
				ret = false;
			}

			if (ret==false)		// a valid key was pressed
			{
				(arguments[0].preventDefault) ? arguments[0].preventDefault() : arguments[0].returnValue = false;
			}
			return ret;
		}

		if (document.attachEvent)
			document.attachEvent('onkeydown', onkeydown);
		else if (document.addEventListener)
			document.addEventListener('keydown', onkeydown, false);
	},
	
	getCurtime: function()
	{
		return new Date().getTime()-cake.startTime;
	},
	
	/*
	Set the playback to play
	*/
	play: function()
	{
		if (cake.paused)
		{
			if (cake.player)
			{
				log("Fixing starttime by "+(cake.startTime - (new Date().getTime()-cake.curTime)));
				cake.curTime=cake.player.currentTime*1000;
				cake.startTime=new Date().getTime()-cake.curTime;
				cake.player.play();
			}
			else
			{
				cake.startTime=new Date().getTime()-cake.curTime;
			}
			cake.paused=0;
			
			cake.processLyricsEvents();
			cake.processCreditsEvents();
			cake.runAnimations();
			
			cake.timers['sync']=setTimeout(cake.sync, 20);
		}
	},
	
	/*
	Set the playback to paused
	*/
	pause: function()
	{
		cake.paused=1;
		if (cake.player)
		{
			cake.player.pause();
			cake.curTime=cake.player.currentTime*1000;
		}
		else
		{
			cake.curTime=cake.getCurtime();
		}
		
		for (var timer in cake.timers)
		{
			clearTimeout(cake.timers[timer]);
		}
		cake.animationData.last=0;
	},
	
	seek: function(distance)
	{
		cake.pause();
		if (cake.player)
		{
			cake.player.currentTime+=distance/1000;
			cake.curTime=cake.player.currentTime*1000;
		}
		else
		{
			cake.curTime+=distance;
		}
		cake.startTime=new Date().getTime()-cake.curTime;
		
		var seekListeners=[cake.seekLyrics, cake.seekCredits, cake.seekAnimations];
		for (var lindex=0; lindex<seekListeners.length; lindex++)
		{
			var listener=seekListeners[lindex];
			listener(distance);
		}
		
		cake.play();
	},
	
	seekLyrics: function(distance)
	{
		if (distance<0)
			cake.seekLyricsBackward();
		else
			cake.seekLyricsForward();
	},
	
	seekLyricsBackward: function()
	{
		if (cake.lyricsPage>=cake.lyricsPages.length)
			cake.lyricsPage=cake.lyricsPages.length-1;
		if (cake.curTime>cake.lyricsPages[cake.lyricsPage].getStartTime())	// still on the same page
		{
			var curpage=cake.lyricsPages[cake.lyricsPage];
			
			while (curpage.get(cake.lyricsEvent) && curpage.get(cake.lyricsEvent).getStartTime()>cake.curTime)
			{
				var curevent=curpage.get(cake.lyricsEvent);
				if (curevent.undo)
					curevent.undo();
				cake.lyricsEvent--;
			}
		}
		else
		{
			while (cake.lyricsPage>0 && cake.lyricsPages[cake.lyricsPage].getStartTime()>cake.curTime)
			{
				cake.lyricsPage--;
			}
			
			var curpage=cake.lyricsPages[cake.lyricsPage];
			
			while (curpage.get(cake.lyricsEvent) && curpage.get(cake.lyricsEvent).getStartTime()<cake.curTime)
			{
				var curevent=curpage.get(cake.lyricsEvent);
				if (curevent && curevent.run)
				{
					curevent.run();
				}
				cake.lyricsEvent++;
			}
		}
		
	},
	
	seekLyricsForward: function()
	{
		// Nothing special to be done here
	},
	
	seekCredits: function(distance)
	{
		if (distance<0)
		{
			while (cake.creditsEvents[cake.creditsEvent] && cake.creditsEvents[cake.creditsEvent].getStartTime()>cake.curTime)
			{
				cake.creditsEvents[cake.creditsEvent].undo();
				cake.creditsEvent--;
			}
		}
	},
	
	sync: function()
	{
		if (cake.player && !cake.paused)
		{
			//log("Curtime difference: "+(cake.curTime - (cake.player.currentTime*1000)));
			cake.curTime=cake.player.currentTime*1000;
			cake.startTime=new Date().getTime()-cake.curTime;
			
			cake.timers['sync']=setTimeout(cake.sync, 200);
		}
	},
	
	musicStarted: function()
	{
		if (cake.paused)
			cake.play();
	},
	
	blink: function(blinker)
	{
		nextChar=blinker.innerHTML;
		var newChar='_';
		if (nextChar=='_')
			newChar='&nbsp;';
		if (nextChar=='&nbsp;')
			newChar='_';
		if (!cake.paused)
			blinker.innerHTML=newChar;
		
		setTimeout(function(){
			cake.blink(blinker)},data.blinkerTime);
		
	},
	
	initLyrics: function()
	{
	
		function NewLetter(starttime, parentelement, letter) {
			this.starttime=starttime;
			this.parentelement=parentelement;
			this.letter=letter;
		}
		NewLetter.prototype.getStartTime=function() {
			return this.starttime;
		}
		NewLetter.prototype.run=function() {
			this.oldlength=this.parentelement.innerHTML.length;
			this.parentelement.innerHTML=this.parentelement.innerHTML+this.letter;
		}
		NewLetter.prototype.undo=function() {
			this.parentelement.innerHTML=this.parentelement.innerHTML.substring(0,this.oldlength);
		}
		
		function NewPage(starttime, parentelement) {
			this.starttime=starttime;
			this.parentelement=parentelement;
		}
		NewPage.prototype.getStartTime=function() {
			return this.starttime;
		}
		NewPage.prototype.run=function() {
			this.parentelement.innerHTML='';
		}
		
		function Page(starttime) {
			this.starttime=starttime;
			this.events=new Array();
		}
		Page.prototype.getStartTime=function() {
			return this.starttime;
		}
		Page.prototype.getLength=function() {
			return this.events.length;
		}
		Page.prototype.get=function(index) {
			//log("Retrieving event "+index + " from length of "+this.events.length);
			return this.events[index];
		}
		Page.prototype.push=function(object) {
			var oldlength=this.events.length;
			this.events[this.events.length]=object;
			//log("Added event to this page, index: "+oldlength+" new length: "+this.events.length);
		}
		
		
		var lyricsSpan=document.createElement("span");
		cake.lyricsdiv.appendChild(lyricsSpan);
		
		var curtime=data.lyricsDelay;
		
		var page=new Page(curtime);
		cake.lyricsPages.push(page);
		for (var index=0; index<lyrics.length; index++)
		{
			var lyric=lyrics[index];
			var line=lyric.text;
			var delay=lyric.delay*1000;
			for (var lindex=0; lindex<line.length; lindex++)
			{
				//if (index==0 && lindex==0) alert(line.length);
				var char=line.substring(lindex,lindex+1);
				var event=new NewLetter(curtime+lindex/line.length*delay, lyricsSpan, char);
				page.push(event);
			}
			curtime+=delay;
			if (lyric.newline)
			{
				var event=new NewLetter(curtime,lyricsSpan, '<br />');
				page.push(event);
			}
			if (lyric.clear)
			{
				var event=new NewPage(curtime,lyricsSpan);
				page.push(event);
				page=new Page(curtime);
				page.push(event);
				cake.lyricsPages.push(page);
			}
		}
	},
	
	processLyricsEvents: function()
	{
		clearTimeout(cake.lyricsCurTimer);
		// check if we need to load the events of the other page (we ran out of events on this page)
		if (cake.lyricsPage>=cake.lyricsPages.length)
			return;
		if (cake.lyricsEvent+1>=cake.lyricsPages[cake.lyricsPage].getLength())
		{
			cake.lyricsPage++;
			cake.lyricsEvent=-1;
		}

		// load up the data for the current page and get the next event that we haven't played
		var curpage=cake.lyricsPages[cake.lyricsPage];
		if (!curpage)
		{
			log("Can't find current page "+cake.lyricsPage);
			return;
		}
		var nextevent=curpage.get(cake.lyricsEvent+1);
		
		cake.curTime=new Date().getTime() - cake.startTime;
		if (nextevent)
			cake.timers['lyrics']=setTimeout(cake.runLyricsEvent, nextevent.getStartTime()-cake.curTime);
		else
			log("End of events");
	},
	
	runLyricsEvent: function() {
		if (!cake.paused)
		{
			var curpage=cake.lyricsPages[cake.lyricsPage];
			var nextevent=curpage.get(cake.lyricsEvent+1);
			if (nextevent)
			{
				nextevent.run();
				cake.lyricsEvent++;
				cake.processLyricsEvents();
			}
			else
			{
				log("Could not load next event, even though processLyricsEvents thought it was good");
			}
		}
	},
	
	initCredits: function()
	{
		function TimedEvent(starttime) {
			this.starttime=starttime;
		}
		TimedEvent.prototype.getStartTime=function() {
			return this.starttime;
		}
		
		function NewLine(starttime, parentelement, text) {
			this.starttime=starttime;
			this.parentelement=parentelement;
			this.text=text;
			this.selfline=document.createElement('div');
		}
		NewLine.prototype=new TimedEvent;
		NewLine.prototype.constructor=NewLine;
		NewLine.prototype.run=function() {
			this.pushedline=this.parentelement.childNodes[0];
			this.parentelement.removeChild(this.pushedline);
			while (this.selfline.childNodes.length>0)
				this.selfline.removeChild(this.selfline.childNodes[0]);
			this.realline=document.createElement('span');
			this.invisibleline=document.createElement('span');
			this.invisibleline.className='invisible';
			var text=this.text.replace(' ','&nbsp;');
			this.invisibleline.innerHTML=text;
			this.selfline.appendChild(this.realline);
			this.selfline.appendChild(cake.creditsBlinker);
			this.selfline.appendChild(this.invisibleline);
			this.parentelement.appendChild(this.selfline);
		}
		NewLine.prototype.undo=function() {
			this.parentelement.removeChild(this.selfline);
			this.parentelement.insertBefore(this.pushedline, this.parentelement.childNodes[0]);
		}
		NewLine.prototype.getLine=function() {
			return this.selfline;
		}
		
		function NextLetter(starttime, line) {
			this.starttime=starttime;
			this.line=line;
		}
		NextLetter.prototype=new TimedEvent;
		NextLetter.prototype.constructor=NextLetter;
		NextLetter.prototype.run=function() {
			var vis=this.line.childNodes[0];
			var invis=this.line.childNodes[2];
			this.letter=invis.innerHTML.substring(0,1);
			if (this.letter=='&')
			{
				var next=invis.innerHTML.indexOf(';')+1;
				this.letter=invis.innerHTML.substring(0,next);
			}
			invis.innerHTML=invis.innerHTML.substring(this.letter.length);
			vis.innerHTML+=this.letter;
		}
		NextLetter.prototype.undo=function() {
			var vis=this.line.childNodes[0];
			var invis=this.line.childNodes[2];
			invis.innerHTML=this.letter+invis.innerHTML;
			vis.innerHTML=vis.innerHTML.substring(0,vis.innerHTML.length-this.letter.length);
		}
		
		function FinishLine(starttime, line) {
			this.starttime=starttime;
			this.line=line;
		}
		FinishLine.prototype=new TimedEvent;
		FinishLine.prototype.constructor=FinishLine;
		FinishLine.prototype.run=function() {
			var vis=this.line.childNodes[0];
			var blinker=this.line.childNodes[1];
			var invis=this.line.childNodes[2];
			
			this.line.removeChild(blinker);
			
			var gap=document.createElement('span');
			gap.innerHTML='&nbsp;';
			this.line.insertBefore(gap,invis);
		}
		FinishLine.prototype.undo=function() {
			var vis=this.line.childNodes[0];
			var blinker=this.line.childNodes[1];
			var invis=this.line.childNodes[2];
			
			this.line.removeChild(blinker);
			
			this.line.insertBefore(cake.creditsBlinker,invis);
		}
		
		for (var i=0; i<data.maxCredits; i++)
		{
			var blank=document.createElement('div');
			blank.innerHTML='&nbsp;';
			cake.creditsdiv.appendChild(blank);
		}
		
		var starttime=data.creditsStartTime*1000;
		
		var totalchars=0;
		for (var index=0; index<credits.length; index++)
		{
			totalchars+=credits[index].length+1;
		}
		var perchardelay=data.creditsMaxTime*1000/totalchars;
		
		var curchar=0;
		for (var index=0; index<credits.length; index++)
		{
			var temp=new NewLine(starttime+perchardelay*curchar, cake.creditsdiv, credits[index]);
			cake.creditsEvents[cake.creditsEvents.length]=temp;
			var linediv=temp.getLine();
			for (var lindex=0; lindex<credits[index].length; lindex++)
			{
				var temp=new NextLetter(starttime+perchardelay*curchar, linediv);
				cake.creditsEvents[cake.creditsEvents.length]=temp;
				curchar++;
			}
			var temp=new FinishLine(starttime+perchardelay*curchar, linediv);
			cake.creditsEvents[cake.creditsEvents.length]=temp;
			curchar++;
		}
	},

	processCreditsEvents: function()
	{
		clearTimeout(cake.creditsCurTimer);
		var nextevent=cake.creditsEvents[cake.creditsEvent+1];
		cake.curTime=new Date().getTime() - cake.startTime;
		if (nextevent)
			cake.timers['credits']=setTimeout(cake.runCreditsEvent, nextevent.getStartTime()-cake.curTime);
		else
			log("End of credits");
	},
	
	runCreditsEvent: function()
	{
		var nextevent=cake.creditsEvents[cake.creditsEvent+1];
		if (!cake.paused && nextevent)
		{
			nextevent.run();
			cake.creditsEvent++;
			cake.processCreditsEvents();
		}
	},
	
	runAnimations: function()
	{
		cake.animationData.last=new Date().getTime();
		cake.processAnimations();
	},
	
	processAnimations: function()
	{
		var distance=function(timedistance, settings) {
			var percent=timedistance/settings.repeat;
			return percent*settings.size;
		}
		
		var curtime=new Date().getTime();
		
		// leftscrolly
		var leftscrolly=document.getElementById('leftscrollybox');
		var leftscrollysettings={
			size:201,
			repeat:3000
		}
		var leftscrollyY=distance(curtime-cake.animationData.last, leftscrollysettings);
		cake.animationData.left+=leftscrollyY;
		cake.animationData.left%=leftscrollysettings.size;
		leftscrolly.style.backgroundPosition="0 "+cake.animationData.left+"px";
		
		// rightscrolly
		var rightscrolly=document.getElementById('rightscrollybox');
		var rightscrollysettings={
			size:201,
			repeat:3000
		}
		var rightscrollyY=distance(curtime-cake.animationData.last, rightscrollysettings);
		cake.animationData.right-=rightscrollyY;
		cake.animationData.right%=rightscrollysettings.size;
		rightscrolly.style.backgroundPosition="0 "+cake.animationData.right+"px";
		
		// scanline
		var scanline=document.getElementById('scanline');
		var scanlinesettings={
			size:400,
			repeat: 1000
		}
		var scanscroll=distance(curtime-cake.animationData.last, scanlinesettings)
		cake.animationData.scanline+=scanscroll;
		if (cake.animationData.scanline>document.getElementById('background').offsetHeight)
			cake.animationData.scanline=-400;
		scanline.style.top=cake.animationData.scanline+"px";
		
		
		cake.animationData.last=new Date().getTime();
		cake.timers['animations']=setTimeout(cake.processAnimations, 20);
	},
	
	seekAnimations: function(distance)
	{
		cake.animationData.left+=distance*10;
		cake.animationData.right-=distance*10;
	}
}

window.onLoad=setTimeout("cake.init()",2);
//window.addEventListener("load",cake.init,0);
