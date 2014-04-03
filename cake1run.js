var cake1 = {
	init: function ()
	{
		cake1.engine = window.cakeengine;
		cake1.engine.init(data.song);
		cake1.lyricsdiv = document.getElementById('lyricstext');
		cake1.creditsdiv = document.getElementById('creditstext');

		cake1.drawLyricsBorder();
		cake1.drawCreditsBorder();

		cake1.initCredits();

		cake1.initLyrics();

		cake1.initBlinker();

		cake1.engine.play();
	},
	drawLyricsBorder: function ()
	{
		var verttext='';
		for (var x = 0; x<30; x++)
		{
			verttext+='|<br />';
		}
		var horiztext='';
		for (var x = 0; x<47; x++)
		{
			horiztext+='-';
		}
		var left = document.getElementById('lyricsleft');
		if (left) left.innerHTML = verttext;

		var top = document.getElementById('lyricstop');
		if (top) top.innerHTML = horiztext;

		var right = document.getElementById('lyricsright');
		if (right) right.innerHTML = verttext;

		var bottom = document.getElementById('lyricsbottom');
		if (bottom) bottom.innerHTML = horiztext;

	},
	drawCreditsBorder: function ()
	{
		var verttext='';
		for (x = 0; x<16; x++)
		{
			verttext+='|<br />';
		}
		var horiztext='';
		for (x = 0; x<47; x++)
		{
			horiztext+='-';
		}

		var left = document.getElementById('creditsleft');
		if (left) left.innerHTML = verttext;

		var top = document.getElementById('creditstop');
		if (top) top.innerHTML = horiztext;

		var right = document.getElementById('creditsright');
		if (right) right.innerHTML = verttext;

		var bottom = document.getElementById('creditsbottom');
		if (bottom) bottom.innerHTML = horiztext;
	},

	initBlinker: function ()
	{
		if (!cake1.lyricsBlinker)
		{
			cake1.lyricsBlinker = document.createElement("span");
			cake1.lyricsdiv.appendChild(cake1.lyricsBlinker);
			cake1.blink(cake1.lyricsBlinker);
		}
		if (!cake1.creditsBlinker)
		{
			var linediv = document.createElement("div");
			linediv.innerHTML="&nbsp;";
			cake1.creditsBlinker = document.createElement("span");
			cake1.creditsBlinker.id="creditsBlinker";
			linediv.insertBefore(cake1.creditsBlinker, linediv.childNodes[0]);
			cake1.creditsdiv.appendChild(linediv);
			cake1.blink(cake1.creditsBlinker);
		}
	},

	blink: function (blinker)
	{
		nextChar = blinker.innerHTML;
		var newChar = '_';
		if (nextChar == '_')
			newChar = '&nbsp;';
		if (nextChar == '&nbsp;')
			newChar = '_';
		if (!cake1.engine.isPaused())
			blinker.innerHTML = newChar;

		setTimeout(function (){
			cake1.blink(blinker)
		}, data.blinkerTime);

	},

	initLyrics: function ()
	{

		var ChangePicture = function (starttime, parentelement, pictureindex, newpage) {
			this.startTime = starttime;
			this.parentelement = parentelement;
			this.pictureindex = pictureindex;
			this.newpage = newpage;
		};
		ChangePicture.prototype.run = function () {
			this.oldpicture = cake1.pictureindex;
			cake1.setPicture(this.parentelement, this.pictureindex);
		};
		ChangePicture.prototype.undo = function () {
			if (!this.newpage) {
				cake1.setPicture(this.parentelement, this.oldpicture);
			}
		};

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
		cake1.lyricsdiv.appendChild(lyricsSpan);

		var curPicture = -1;	// keep track of picture, to create a ChangePicture at the top of a page
		var curtime = data.lyricsDelay;

		var firstpage = new NewPage(curtime,lyricsSpan);
		cake1.engine.addEvent('lyrics', firstpage);
		var event = new ChangePicture(curtime, pictureDiv, curPicture, true);
		cake1.engine.addEvent('lyrics', event);
		for (var index = 0; index<lyrics.length; index++)
		{
			var lyric = lyrics[index];
			var line = lyric.text;
			var delay = lyric.delay*1000;

			if (pictureDiv && lyric['changepicture'] > -1) {
				var event = new ChangePicture(curtime, pictureDiv, lyric['changepicture']);
				curPicture = lyric['changepicture'];
				cake1.engine.addEvent('lyrics', event);
			}
			for (var lindex = 0; lindex<line.length; lindex++)
			{
				//if (index==0 && lindex==0) alert(line.length);
				var char = line.substring(lindex,lindex+1);
				var event = new NewLetter(curtime+lindex/line.length*delay, lyricsSpan, char);
				cake1.engine.addEvent('lyrics', event);
			}
			curtime += delay;
			if (lyric.newline)
			{
				var event = new NewLetter(curtime,lyricsSpan, '<br />');
				cake1.engine.addEvent('lyrics', event);
			}
			if (lyric.clear)
			{
				var event = new NewPage(curtime,lyricsSpan);
				cake1.engine.addEvent('lyrics', event);
				var event = new ChangePicture(curtime, pictureDiv, curPicture, true);
				cake1.engine.addEvent('lyrics', event);
			}
		}
	},

	setPicture: function (parentelement, pictureindex)
	{
		if (! parentelement) return;
		cake1.pictureindex = pictureindex
		parentelement.innerHTML = '';
		var curart = asciiart[pictureindex + ''];
		if (curart) {
			for (var i = 0; i < curart.length; i++) {
				var node = document.createElement("div");

				var curline = curart[i];
				curline = curline.replace(/</g, "&lt;");
				curline = curline.replace(/>/g, "&gt;");
				curline = curline.replace(/ /g, "&nbsp;");
				node.innerHTML = curline;

				parentelement.appendChild(node);
			}
		}
	},

	initCredits: function ()
	{
		var BeginningSeekBlinker = function (starttime, parentelement) {
			// when seeking backwards through the credits,
			// this event will re-add the blinker
			this.startTime = starttime;
			this.parentelement = parentelement;
		};
		BeginningSeekBlinker.prototype.run = function () {};
		BeginningSeekBlinker.prototype.undo = function () {
			var lastline = this.parentelement.childNodes[this.parentelement.childNodes.length-1];
			lastline.insertBefore(cake1.creditsBlinker, lastline.childNodes[0]);
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
			this.selfline.appendChild(cake1.creditsBlinker);
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

			this.line.insertBefore(cake1.creditsBlinker,invis);
		};

		for (var i = 0; i<data.maxCredits; i++)
		{
			var blank = document.createElement('div');
			blank.innerHTML='&nbsp;';
			cake1.creditsdiv.appendChild(blank);
		}

		var starttime = data.creditsStartTime*1000;

		var totalchars = 0;
		for (var index = 0; index<credits.length; index++)
		{
			totalchars += credits[index].length + 1;
		}
		var perchardelay = data.creditsMaxTime*1000/totalchars;

		var curchar = 0;
		cake1.engine.addEvent('credits', new BeginningSeekBlinker(starttime, cake1.creditsdiv));
		for (var index = 0; index<credits.length; index++)
		{
			var temp = new NewLine(starttime+perchardelay*curchar, cake1.creditsdiv, credits[index]);
			cake1.engine.addEvent('credits', temp);
			var linediv = temp.getLine();
			for (var lindex = 0; lindex<credits[index].length; lindex++)
			{
				var temp = new NextLetter(starttime+perchardelay*curchar, linediv);
				cake1.engine.addEvent('credits', temp);
				curchar++;
			}
			var temp = new FinishLine(starttime+perchardelay*curchar, linediv);
			cake1.engine.addEvent('credits', temp);
			curchar++;
		}
	}

};

window.onLoad = setTimeout(function () {
	cake1.init();
}, 1);
