var loosp2js = (function (){
    "use strict";

    var prefix = "#LoospExpression";

    function loosp2js(script){
        if(!script){
            var arr = document.getElementsByTagName("script");
            for(var i = 0; i < arr.length; ++i){
                if(arr[i].type === "text/loosp"){
                    var script = arr[i].innerHTML;
                    script = loosp2js(script);
                    eval(script);
                }
            }
        }
        else{
            return translate(script);
        }
    }

    function translate(script){
        script = script.trim();
        var program = [script], trans = [];
        //translate
        for(var formName in grammar)
            processForm(program, formName, trans);

        console.log(program[0]);
        return program[0];
    }

    function processForm(program, formName, trans){
        //if(formName == "compile") console.log(program.slice().join("\n"));
        var form = grammar[formName], expr, matches;
        for(var i = 0, l = program.length; i < l; ++i){
            expr = program[i];
            do{
                program[i] = expr;
                matches = expr.match(form.pattern);
                if(matches){
                    var tokens = expr.split(/\s+/);
                    var expr2 = expr.replace(
                        form.pattern,
                        form.translate.bind(form, program, tokens));
                    if(expr2 != expr){
                        expr = expr2
                        trans[i] = true;
                    }
                }
            }while(expr != program[i])
        }
    }

    var grammar = {

        literal: {
            pattern: /"([^"]*"|\b\d+\.\d+\b|\b\d+\b)/g,
            translate: function(program, token, match){
                var name = prefix + program.length;
                program.push(match)
                return name;
            }
        },

        sexpr: {
            pattern: /\(([^\(\)])*\)/g,
            translate: function(program, tokens, match){
                var name = prefix + program.length;
                program.push(match.replace(/(\(|\))/g, ""));
                return name;
            }
        },

        array:{
            pattern:/\[(\S+(\s+\S+)*)\]/,
            translate: function(program, tokens, match){
                var name = prefix + program.length;
                program.push(match.split(/\s+/).join(","));
                return name;
            }
        },

        operators1: {
            pattern: /^([+\-%^*\/><])(\s+\S+){2,}$/,
            translate: function(program, tokens, match){
                var op = tokens.shift();
                var name = prefix + program.length;
                program.push("(" + tokens.join(op) + ")");
                return name;
            }
        },

        operators2: {
            pattern: /^(and|or|=)(\s+\S+){2,}$/,
            translate: function(program, tokens, match){
                var op = tokens.shift();
                if(op == "and") op = "&";
                else if(op == "or") op = "|";
                var name = prefix + program.length;
                program.push("(" + tokens.join(op + op) + ")");
                return name;
            }
        },

        func: {
            pattern: /^define\s+(#LoospExpression\d+)((?:\s+[^\s\(\)]+)+)$/,
            translate: makeFunction.bind(this, "function")
        },

//this needs to come after func, as it is a more generalized pattern
// and can break function definitions if it came first. Alternately,
// we could change the 'define' keyword for functions.
        variable: {
            pattern: /^define(\s+[^\s\(\)]+){2}$/,
            translate: function(program, tokens, match){
                tokens.shift(); //discard "define"
                return "var " + tokens.shift() + " = " + tokens.shift() + ";";
            }
        },

        begin: {
            pattern: /^begin(\s+[^\s\(\)]+)+$/,
            translate: function(program, tokens, match){
                tokens.shift(); // discard "for-each"
                var tail = tokens.pop();
                tokens.push("return " + tail);
                var body = tokens.join(" ");
                return "(function(){" + body + "})();";
            }
        },

        forEach: {
            pattern: /^for-each\s+\S+\s+#LoospExpression\d+$/,
            translate: function(program, tokens, match){
                tokens.shift(); // discard "for-each"
                var arr = tokens.shift();
                var thunk = tokens.shift();
                var script = arr + ".forEach(" + thunk + ")";
                return script;
            }
        },

        when: {
            pattern: /^when\s+[^\s\(\)]+(\s+[^\s\(\)]+)+$/,
            translate: function(program, tokens, match){
                tokens.shift(); // discard "when"
                var expr = tokens.shift();
                var body = tokens.join(" ");
                return "if(" + expr + "){" + body + "}";
            }
        },

        ifBlock: {
            pattern: /^if\s+[^\s\(\)]+(\s+#LoospExpression\d+){2}$/,
            translate: function(program, tokens, match){
                tokens.shift(); // discard "if"
                var expr = tokens.shift();
                var yes = tokens.shift();
                var no = tokens.shift();
                return "if(" + expr + "){" + yes + "}else{" + no + "}";
            }
        },

        unless: {
            pattern: /^unless\s+[^\s\(\)]+(\s+[^\s\(\)]+)+$/,
            translate: function(program, tokens, match){
                tokens.shift(); // discard "unless"
                var expr = tokens.shift();
                var body = tokens.join(" ");
                return "if(!" + expr + "){" + body + "}";
            }
        },

        lambda: {
            pattern: /^lambda\s+#LoospExpression\d+(\s+[^\s\(\)]+)+$/,
            translate: makeFunction.bind(this, "lambda")
        },

        class: {
            pattern: /^class\s+#LoospExpression\d+(\s+[^\s\(\)]+)+$/,
            translate: makeFunction.bind(this, "class")
        },

        send: {
            pattern: /^send(\s+[^\s\(\)]+){2,}$/,
            translate: function(program, tokens){
                tokens.shift(); //discard "send"
                var target = tokens.shift();
                var func = tokens.shift();
                var args = tokens.join(",");
                return "(" + target + "&&(" + target + "." + func + "(" + args + ")));";
            }
        },

        newObject: {
            pattern: /^new(\s+[^\s\(\)]+)+$/,
            translate: function(program, tokens){
                tokens.shift(); //discard "new"
                var func = tokens.shift();
                var args = tokens.join(",");
                return "new " + func + "(" + args + ");";
            }
        },

        call: {
            pattern: /^[\w.]+(\s+[\w.#]+)*$/,
            translate: function(program, tokens, match){
                var func = tokens.shift();
                var args = tokens.join(",");
                return func + "(" + args + ");";
            }
        },

        setter: {
            pattern: /^set!(\s+[^\s\(\)]+){2}$/,
            translate: function(program, tokens){
                tokens.shift(); //discard "set!"
                return tokens.shift() + " = " + tokens.shift() + ";";
            }
        },

        compile: {
            pattern: /#LoospExpression\d+\b/g,
            translate: function(program, tokens, match){
                var id = match.replace(prefix, "");
                return program[id];
            }
        },

    };

    function makeFunction(type, program, tokens, match){
        tokens.shift(); // discard keyword
        var signatureID = tokens.shift().replace(prefix, "");
        var signature = program[signatureID];
        var args = signature.split(/\s+/);
        var name = "";
        if(type != "lambda")
            name = args.shift();
        if(type != "class"){
            var tail = tokens.pop();
            if(tail)
                tokens.push("return " + tail);
        }
        var s = "function " + name
            + "(" + args.join(",") + "){"
            + tokens.join(" ") + " }";
        return s;
    }

    return loosp2js;
})();