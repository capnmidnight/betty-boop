if(!window.com) window.com = {};
if(!com.capnmidnight) com.capnmidnight = {};
if(!com.capnmidnight.interrobang){
    com.capnmidnight.interrobang = (function(){
        // I have the unicode values broken out like this
        // because I find them easier to manipulate as a
        // quasi-enumeration.
        var characters = {
            OpenSmartQuote : "\u201c",
            CloseSmartQuote : "\u201d",
            EnDash : "\u2013",
            EmDash : "\u2014",
            Ellipsis : "\u2026",
            Prime : "\u2032",
            DoublePrime : "\u2033",
            TriplePrime : "\u2034",
            BallotBox : "\u2610",
            BallotBoxWithCheck : "\u2611",
            BallotBoxWithX : "\u2612",
            ChessWhiteKing : "\u2654",
            ChessWhiteQueen : "\u2655",
            ChessWhiteRook : "\u2656",
            ChessWhiteBishop : "\u2657",
            ChessWhiteKnight : "\u2658",
            ChessWhitePawn : "\u2659",
            ChessBlackKing : "\u265a",
            ChessBlackQueen : "\u265b",
            ChessBlackRook : "\u265c",
            ChessBlackBishop : "\u265d",
            ChessBlackKnight : "\u265e",
            ChessBlackPawn : "\u265f",
            Interrobang : "\u203D"
        };


        // These pattern objects really need be nothing more than a pair of values.
        // to create an entire class for them would be overkill. As they are also
        // internal, future considerations for an object model will not break backwards
        // compatability. Also, I don't really give a shit.
        var patterns = [
            [/"([\s\S]+?)"/gm, characters.OpenSmartQuote + "$1" + characters.CloseSmartQuote],
            [/--/gm, characters.EmDash],
            [/\W-\W/gm, characters.EnDash],
            [/\.\.\./gm, characters.Ellipsis],
            [/\?\!/gm, characters.Interrobang],
            [/\!\?/gm, characters.Interrobang],
            [/(\d+)+/gm, function(str, mtch){console.log(mtch);}]
        ];

        // Let's support a couple of different ways to get at "text"
        var potentialKeys = ["value", "innerText", "textContent", "innerHTML"];
    
        var makeAThing = function(domObject, eventName){
            var i, l = potentialKeys.length, key;
            for(i = 0; i < l && key == null; ++i){
                if(domObject[potentialKeys[i]] !== undefined){
                    key = potentialKeys[i];
                }
            }
        
            if(key === null)
                throw "Could not find an appropriate value property for the provided DOM object";
        
            var convert = function(){
                var s = domObject[key], i, rule, res, e;
                for(i = 0; i < patterns.length; ++i){
                    rule = patterns[i];
                    if(s.match(rule[0])){
                        if(rule[1] instanceof Function){
                            while(e = rule[0].exec(s)){
                                if(res = rule[1](s, e)){
                                    s = res;
                                }
                            }
                        }
                        else{
                            s = s.replace(rule[0], rule[1]);
                        }
                    }
                }
                domObject[key] = s;
            }
        
            if(domObject.attachEvent !== undefined){
                domObject.attachEvent("on" + eventName, convert);
            }
            else{
                domObject.addEventListener(eventName, convert, false);
            }
        };
        return makeAThing;
    })();
}
