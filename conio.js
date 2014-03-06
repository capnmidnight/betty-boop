function clrscr() {
    for (var y = 0; y < BUFFER_HEIGHT; ++y)
        for (var x = 0; x < BUFFER_WIDTH; ++x)
            _set(x, y, _currentBG, 8, "&nbsp;");
}

function kbhit() {
    var wasHit = _kbHit;
    _kbHit = false;
    return wasHit;
}

function getch() {
    return _keyQueue.shift();
}

function getche() {
    var c = getch();
    putch(c);
    return c;
}

function ungetch(c) {
    _keyQueue.unshift(c);
}

function putch(c) {
    if (c == 13) {
        _cursorX = 0;
        _cursorY++;
    }
    else {
        _set(_cursorX, _cursorY, _currentFG, _currentBG, String.fromCharCode(c));
        _cursorX++;
    }
    if (_cursorX == BUFFER_WIDTH) {
        _cursorY++;
        _cursorX = 0;
    }
    if (_cursorY == BUFFER_HEIGHT) {
        _cursorY--;
        _shiftLines(0);
    }
}

function cputs(str) {
    for (var i = 0; i < str.length; ++i)
        putch(str.charCodeAt(i));
}

function cprintf() {
    var args = Array.prototype.slice.call(arguments);
    var format = args.shift();
    for (var i = 0; i < format.length; ++i) {
        var c = format.charAt(i);
        if (c == '%') {
            i++;
            cputs(args.shift().toString());
        }
        else {
            putch(c);
        }
    }
}

function textcolor(c) {
    _currentFG = c;
}

function textbackground(c) {
    _currentBG = c;
}

function wherex() {
    return _cursorX;
}

function wherey() {
    return _cursorY;
}

function delline() {
    _shiftLines(_cursorY);
}

function gotoxy(x, y) {
    _cursorX = x;
    _cursorY = y;
}

function cgets() {
    var buffer = "";
    if (_linesAvail > 0) {
        var key = 0;

        while (_keyQueue.length > 0 && key != 13) {
            key = _keyQueue.shift();
            if (key == 13)
                key = 10;
            buffer += String.fromCharCode(key);
        }
        _linesAvail--;
    }
    return buffer;
}

