var BUFFER_HEIGHT = 25;
var BUFFER_WIDTH = 80;
var MILLIS_PER_FRAME = 25; // with the ASCII stuff, fast updates can be kind of confusing, so 4fps is a good start

var BLACK = 0;
var BLUE = 1;
var GREEN = 2;
var CYAN = 3;
var RED = 4;
var MAGENTA = 5;
var BROWN = 6;
var LIGHTGRAY = 7;
var DARKGRAY = 8;
var LIGHTBLUE = 9;
var LIGHTGREEN = 10;
var LIGHTCYAN = 11;
var LIGHTRED = 12;
var LIGHTMAGENTA = 13;
var YELLOW = 14;
var WHITE = 15;


var _keyQueue = [];
var _cursorX = 0, _cursorY = 0;
var _currentFG = 8, _currentBG = 0;
var _kbHit = false;
var _linesAvail = 0;
var _keyMap = new Array(256);

var _colors = ["black", "navy", "green", "teal", "maroon", "purple", "olive", "gray", "silver", "blue", "lime", "aqua", "red", "fuschia", "yellow", "white"];
var _cells = [];
var _topRowCell;


Object.prototype.addEvent = function (evtName, callback, capture) {
    capture = capture != null ? capture : false;
    if (Object.prototype.addEventListener)
        this.addEventListener(evtName, callback, capture);
    else if (Object.prototype.attachEvent)
        this.attachEvent("on" + evtName, function () {
            callback(window.event);
        });
    else {
        var old = this["on" + evtName];
        if (old)
            this["on" + evtName] = function () { old(); callback(); }
        else
            this["on" + evtName] = callback;
    }
}

document.addEvent("keydown", function (evt) {
    //console.log(evt.keyCode, evt.charCode, evt.which);
    _kbHit = true;
    var key = evt.keyCode;
    _keyMap[key] = true;
    if (key == 13 || (32 <= key && key <= 126)) {
        if (evt.ctrlKey)
            _keyQueue.push('^');
        if (key == 13)
            _linesAvail++;
        if (!evt.shiftKey && 65 <= key && key <= 90)
            key += 32;
        _keyQueue.push(key);
    }
});

document.addEvent("keyup", function (evt) {
    _keyMap[evt.keyCode] = false;
});

function _initialize(loop, screenContainer) {
    try {
        screen = document.createElement("table");
        if (screenContainer == null)
            screenContainer = document.body;
        screenContainer.appendChild(screen);
        screen.style.fontFamily = "fixedsys, courier, \"courier new\", monospace";
        screen.style.backgroundColor = "black";
        screen.style.color = "silver";
        screen.style.border = "ridge 5px #c0c0c0";
        screen.style.borderTop = "outset 3px #c0c0c0";
        screen.cellPadding = 0;
        screen.cellSpacing = 0;


        var topRow = document.createElement("tr");
        _topRowCell = document.createElement("td");
        _topRowCell.colSpan = BUFFER_WIDTH - 8;
        title("C:\\WINDOWS\\DOS.HTM");
        _topRowCell.style.backgroundColor = "blue";
        _topRowCell.style.color = "white";
        _topRowCell.style.fontWeight = "bold";
        topRow.appendChild(_topRowCell);

        var topRowCell = document.createElement("td");
        topRowCell.colSpan = 8;
        topRowCell.innerHTML = "&nbsp;_ [] X&nbsp;";
        topRowCell.style.backgroundColor = "#c0c0c0";
        topRowCell.style.color = "black";
        topRowCell.style.fontWeight = "bold";
        topRow.appendChild(topRowCell);

        screen.appendChild(topRow);

        for (var y = 0; y < BUFFER_HEIGHT; ++y) {
            _cells[y] = new Array();
            var row = document.createElement("tr");
            for (var x = 0; x < BUFFER_WIDTH; ++x) {
                _cells[y][x] = document.createElement("td");
                _cells[y][x].innerHTML = "&nbsp;";
                row.appendChild(_cells[y][x]);
            }
            screen.appendChild(row);
        }

        var counter = 0;
        var state = 0;
        setInterval(loop, MILLIS_PER_FRAME);
    }
    catch (exp) {
        alert("Failed init --> " + exp.message);
    }
}

function _set(x, y, f, b, t) {
    var cell = _cells[y % BUFFER_HEIGHT][x % BUFFER_WIDTH];
    cell.style.color = _colors[f % 16];
    cell.style.backgroundColor = _colors[b % 8];
    cell.innerHTML = t;
}

function _shiftLines(fromY) {
    var row2 = _cells[fromY];
    for (var y = fromY; y < BUFFER_HEIGHT - 1; ++y) {
        var row1 = row2;
        row2 = _cells[y + 1];
        for (var x = 0; x < BUFFER_WIDTH; ++x) {
            var cell1 = row1[x];
            var cell2 = row2[x];
            cell1.style.backgroundColor = cell2.style.backgroundColor;
            cell1.style.color = cell2.style.color;
            cell1.innerHTML = cell2.innerHTML;
            if (y == BUFFER_HEIGHT - 2) {
                cell2.innerHTML = "&nbsp;";
            }
        }
    }
}

function title(str) {
    _topRowCell.innerHTML = "&nbsp;" + str;
}

function iskeydown(n) {
    return _keyMap[n];
}