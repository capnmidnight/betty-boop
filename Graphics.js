function debug(text)
{
	var box = document.getElementById("debug");
	if(box !== null)
	{
		box.innerHTML += text;
	}
}
function Point(px, py)
{
	//PRIVATE
	var x = px;
	var y = py;
	
	//PRIVILEGED
	this.getX = function()
	{
		return x;
	};
	this.getY = function()
	{
		return y;
	};
	this.setX = function(px)
	{
		x = px;
	};
	this.setY = function(py)
	{
		y = py;
	};
	this.move = function(px, py)
	{
		x = px;
		y = py;
	};
	this.toString = function()
	{
		return "("+x+", "+y+")";
	};
}
function Pixel(px, py, size, color)
{
	//PRIVATE elements
	var par = new Point(px, py);
	var size = size;
	var color = color;
	var elem = document.createElement("div");
	elem.style.position = "absolute";
	elem.style.overflow = "hidden";
	
	function updateStyle()
	{
		elem.style.width = size + "px";
		elem.style.height = size + "px";
		elem.style.left = par.getX() + "px";
		elem.style.top = par.getY() + "px";
		elem.style.backgroundColor = color;
	};
	updateStyle();
	
	//PRIVILEGED elements
	this.getElement = function()
	{
		return elem;
	};
	this.move = function(x, y)
	{
		par.move(x, y);
		updateStyle();
	};
	this.setSize = function(sz, opt)
	{
		if(opt === undefined || opt === null)
		{
			size = sz;
			updateStyle();
		}
		else
		{
			elem.style.width = sz;
			elem.style.height = opt;
		}
	};
	this.setColor = function(c)
	{
		color = c;
		updateStyle();
	};
	this.setForeColor = function(c)
	{
		elem.style.color = c;
	};
	this.setText = function(txt)
	{
		elem.innerText = txt;
	};
	this.setImage = function(imgSrc)
	{
		elem.style.backgroundImage = "url("+imgSrc+")";
	};
	this.setBorder = function(sz, c)
	{
		if(sz !== undefined && sz !== null)
		{
			elem.style.border = "solid "+sz+"px "+c;
		}
	};
	this.clearBorder = function()
	{
		this.setBorder(0, "transparent");
	};
	this.setX = function(px)
	{
		par.setX(px);
		updateStyle();
	};
	this.setY = function(py)
	{
		par.setY(py);
		updateStyle();
	};
	this.toString = function()
	{
		return "["+par.toString() +color+"] - [("+elem.style.left+", "+elem.style.top+")"+elem.style.backgroundColor+"]";
	};
	this.isVisible = function()
	{
		return x>=0;
	};
}

function Graphics(scrnX, scrnY, scrnWidth, scrnHeight, parentId)
{
	//PRIVATE
	var pixSize = 1;
	var pixBias = 10;
	var pixDist = pixSize * pixBias;
	var par = document.getElementById(parentId);
	var elem = document.createElement("div");
	elem.style.border = "solid 1px #c0c0c0";
	elem.style.overflow = "hidden";
	elem.style.fontFamily = "arial";
	par.appendChild(elem);

	var locX = scrnX;
	var locY = scrnY;
	var width = scrnWidth;
	var height = scrnHeight;

	function createPixel()
	{
		pixels[i] = new Pixel(-pixSize, 0, pixSize, "white");
		elem.appendChild(pixels[i].getElement());
	}
	//pre allocate a few pixels for use
	var pixelCount = Math.floor(Math.sqrt(width*height)*Math.log(Math.log(width*height))); //A funky function for fun fiddling
	var pixels = new Array(pixelCount);
	for(var i = 0; i < pixels.length; ++i)
	{
		createPixel();
	}
	var free = 0;
	elem.style.position = "absolute";
	elem.style.width = width + "px";
	elem.style.height = height + "px";
	elem.style.left = scrnX + "px";
	elem.style.top = scrnY + "px";

	function getPixel()
	{
		if(free >= pixels.length)
		{
			free = pixels.length - 1;
		}
		var p = pixels[free];
		free++;
		return p;
	};
	
	//PRIVILEGED
	
	this.setStroke = function(stroke)
	{
		pixSize = stroke;
		pixDist = pixSize * pixBias;
	};
	
	this.setBackground = function(color)
	{
		elem.style.backgroundColor = color;
	};
	
	this.setBroken = function(boolVal)
	{
		pixBias = boolVal?2:1;
		pixDist = pixSize * pixBias;
	};
	
	this.setColor = function(px, py, c)
	{
		var p = getPixel();
		p.move(px - locX, py - locY);
		p.setSize(pixSize);
		p.clearBorder();
		p.setColor(c);
	};
	this.clear = function()
	{
		for(var i = 0; i < free; ++i)
		{
			pixels[i].setX(-pixSize); //get the pixel off the screen
			pixels[i].setText("");
			pixels[i].clearBorder();
			pixels[i].setImage("");
		}
		free = 0;
	};
	this.drawLine = function(x0, y0, x1, y1, c)
	{
		var dx = x1 - x0;
		if(dx < 0)
		{
			var temp = x1;
			x1 = x0;
			x0 = temp;
			temp = y1;
			y1 = y0;
			y0 = temp;
			dx = -dx;
		}
		
		var dy = y1 - y0;
		
		if(dx <= 1 && Math.abs(dy) >= dx)
		{
			//A vertical line can be optimized to a thin rectangle
			var p = getPixel();
			p.move(x0 - locX, Math.min(y0, y1) - locY);
			p.clearBorder();
			p.setColor(c);
			p.setSize(pixSize, Math.abs(dy));
		}
		else if(Math.abs(dy) <= 1)
		{
			//A horizontal line can be optimized to a thin rectangle
			var p = getPixel();
			p.move(Math.min(x0, x1) - locX, y0 - locY);
			p.clearBorder();
			p.setColor(c);
			p.setSize(Math.abs(dx), pixSize);
		}
		else
		{
			var x2 = Math.floor(x0 + dx / 2 + 0.5);
			var signY = dy / Math.abs(dy);
			var y2 = Math.floor(y0 + dy / 2 + signY * 0.5);
			this.drawLine(x0, y0, x2, y2, c);
			this.drawLine(x2, y2, x1, y1, c);
		}
	};
	this.drawPoly = function(px, py, xs, ys, c)
	{
		var n = xs.length - 1;
		for(var i = 0; i < n; ++i)
		{
			this.drawLine(xs[i]+px, ys[i]+py, xs[i+1]+px, ys[i+1]+py, c);
		}
		this.drawLine(xs[n]+px, ys[n]+py, xs[0]+px, ys[0]+py, c)
	};
	this.drawCircle = function(px, py, radius, c)
	{
		var circumference = Math.PI * 2 * radius;
		var a, cx, cy;
		var s = pixDist;
		for(var i = 0; i <= circumference; i += s)
		{
			a = i / radius;
			cx = radius * Math.cos(a) + px;
			cy = radius * Math.sin(a) + py;
			g.setColor(cx, cy, c);
		}
	};
	this.drawRect = function(px, py, w, h, c)
	{
		var p = getPixel();
		p.move(px - locX, py - locY);
		p.setBorder(pixSize, c);
		p.setColor("transparent");
		p.setSize(w, h);
	};
	this.drawString = function(px, py, txt, c)
	{
		var p = getPixel();
		p.move(px - locX, py - locY);
		p.clearBorder();
		p.setColor("transparent");
		p.setSize(txt.length * 10, 20);
		p.setForeColor(c);
		p.setText(txt);
	};
	var images = new Array();
	this.drawImage = function(px, py, imgSrc)
	{
		var p = getPixel();
		p.move(px - locX, py - locY);
		p.clearBorder();
		p.setColor("transparent");
		images[imgSrc] = new Image();
		images[imgSrc].src = imgSrc;
		p.setSize(images[imgSrc].width, images[imgSrc].height);
		p.setImage(imgSrc);
	};
}