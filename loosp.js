var loosp2js = (function (){
    "use strict";
    function loosp2js(script){
        if(script){
            return translate(script);
        }
        else{
            var arr = document.querySelectorAll("script[type='text/loosp']");
            for(var i = 0; i < arr.length; ++i){
                var script = arr[i].innerHTML;
                script = loosp2js(script);
                console.log(script);
                eval(script);
            }
        }
    }

    function translate(script){
        script = script.trim();
        var program = {script:[script]}, trans = [];
        for(var formName in grammar)
            program[formName] = [];
        for(var formName in grammar)
            processForm(program, formName, trans);
        var exprCount = 0;
        for(var form in program)
            exprCount += program[form].length;
        console.log("Expressions:", exprCount, program);
        return program.script[0];
    }

    function processForm(program, formName, trans){
        var form = grammar[formName], expr, matches;
        for(var j = 0; j < form.on.length; ++j){
            var item = form.on[j];
            for(var i = 0, l = program[item].length; i < l; ++i){
                expr = program[item][i];
                do{
                    program[item][i] = expr;
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
                }while(expr != program[item][i])
            }
        }
    }

    function makeExpr(program, type, script){
        var i = program[type].indexOf(script);
        if(i == -1){
            i = program[type].length;
            program[type].push(script);
        }
        var name = "#" + type + i + "#";
        return name;
    }

    var grammar = {

        sexpr: {
            on: ["script"],
            pattern: /\(([^\(\)])*\)/g,
            translate: function(program, tokens, match){
                return makeExpr(program, "sexpr",
                    match.replace(/(\(|\))/g, ""));
            }
        },

        literal: {
            on: ["sexpr"],
            pattern: /"([^"]*"|\b\d+\.\d+\b|\b\d+\b)/g,
            translate: function(program, token, match){
                return makeExpr(program, "literal",
                    match);
            }
        },

        array:{
            on: ["sexpr"],
            pattern:/\[(\S+(\s+\S+)*)\]/,
            translate: function(program, tokens, match){
                return makeExpr(program, "array",
                    match.split(/\s+/).join(","));
            }
        },

        operatorsA: {
            on: ["sexpr"],
            pattern: /^([+\-%^*\/><])(\s+\S+){2,}$/,
            translate: function(program, tokens, match){
                var op = tokens.shift();
                return makeExpr(program, "operatorsA",
                    "(" + tokens.join(op) + ")");
            }
        },

        operatorsB: {
            on: ["sexpr"],
            pattern: /^(and|or|=)(\s+\S+){2,}$/,
            translate: function(program, tokens, match){
                var op = tokens.shift();
                if(op == "and") op = "&";
                else if(op == "or") op = "|";
                return makeExpr(program, "operatorsB",
                    "(" + tokens.join(op + op) + ")");
            }
        },

        func: {
            on: ["sexpr"],
            pattern: /^define\s+(#sexpr\d+#)((?:\s+[^\s\(\)]+)+)$/,
            translate: makeFunction.bind(this, "func")
        },

//this needs to come after func, as it is a more generalized pattern
// and can break function definitions if it came first. Alternately,
// we could change the 'define' keyword for functions.
        variable: {
            on: ["sexpr"],
            pattern: /^define(\s+[^\s\(\)]+){2}$/,
            translate: function(program, tokens, match){
                tokens.shift(); //discard "define"
                return makeExpr(program, "variable", "var " + tokens.shift() + " = " + tokens.shift() + ";");
            }
        },

        begin: {
            on: ["sexpr"],
            pattern: /^begin(\s+[^\s\(\)]+)+$/,
            translate: function(program, tokens, match){
                tokens.shift(); // discard "for-each"
                var tail = tokens.pop();
                tokens.push("return " + tail);
                var body = tokens.join(" ");
                return makeExpr(program, "begin", "(function(){" + body + "})();");
            }
        },

        forEach: {
            on: ["sexpr"],
            pattern: /^for-each\s+\S+\s+\S+$/,
            translate: function(program, tokens, match){
                tokens.shift(); // discard "for-each"
                var arr = tokens.shift();
                var thunk = tokens.shift();
                var script = arr + ".forEach(" + thunk + ")";
                return makeExpr(program, "forEach", script);
            }
        },

        when: {
            on: ["sexpr"],
            pattern: /^when\s+[^\s\(\)]+(\s+[^\s\(\)]+)+$/,
            translate: function(program, tokens, match){
                tokens.shift(); // discard "when"
                var expr = tokens.shift();
                var body = tokens.join(" ");
                return makeExpr(program, "when", "if(" + expr + "){" + body + "}");
            }
        },

        ifBlock: {
            on: ["sexpr"],
            pattern: /^if\s+[^\s\(\)]+(\s+#sexpr\d+#){2}$/,
            translate: function(program, tokens, match){
                tokens.shift(); // discard "if"
                var expr = tokens.shift();
                var yes = tokens.shift();
                var no = tokens.shift();
                return makeExpr(program, "ifBlock", "if(" + expr + "){" + yes + "}else{" + no + "}");
            }
        },

        unless: {
            on: ["sexpr"],
            pattern: /^unless\s+[^\s\(\)]+(\s+[^\s\(\)]+)+$/,
            translate: function(program, tokens, match){
                tokens.shift(); // discard "unless"
                var expr = tokens.shift();
                var body = tokens.join(" ");
                return makeExpr(program, "unless", "if(!" + expr + "){" + body + "}");
            }
        },

        lambda: {
            on: ["sexpr"],
            pattern: /^lambda\s+#sexpr\d+#(\s+[^\s\(\)]+)+$/,
            translate: makeFunction.bind(this, "lambda")
        },

        class: {
            on: ["sexpr"],
            pattern: /^class\s+#sexpr\d+#(\s+[^\s\(\)]+)+$/,
            translate: makeFunction.bind(this, "class")
        },

        send: {
            on: ["sexpr"],
            pattern: /^send(\s+[^\s\(\)]+){2,}$/,
            translate: function(program, tokens){
                tokens.shift(); //discard "send"
                var target = tokens.shift();
                var func = tokens.shift();
                var args = tokens.join(",");
                return makeExpr(program, "send", "(" + target + "&&(" + target + "." + func + "(" + args + ")));");
            }
        },

        newObject: {
            on: ["sexpr"],
            pattern: /^new(\s+[^\s\(\)]+)+$/,
            translate: function(program, tokens){
                tokens.shift(); //discard "new"
                var func = tokens.shift();
                var args = tokens.join(",");
                return makeExpr(program, "newObject", "new " + func + "(" + args + ");");
            }
        },

        setter: {
            on: ["sexpr"],
            pattern: /^set!(\s+[^\s\(\)]+){2}$/,
            translate: function(program, tokens){
                tokens.shift(); //discard "set!"
                return makeExpr(program, "setter", tokens.shift() + " = " + tokens.shift() + ";");
            }
        },

        // at this point, just going to assume any left-over s-expressions
        // are function calls.
        call: {
            on: ["sexpr"],
            pattern: /^.+$/,
            translate: function(program, tokens, match){
                if(tokens.length == 1)
                    return tokens[0];
                else{
                    var func = tokens.shift();
                    var args = tokens.join(",");
                    return makeExpr(program, "call", func + "(" + args + ");");
                }
            }
        },

        compile: {
            on: ["script"],
            pattern: /#([^\s\d]+)(\d+)#/,
            translate: function(program, tokens, match){
                var matches = match.match(this.pattern);
                var type = matches[1];
                var index = matches[2];
                return program[type][index];
            }
        },

    };

    function makeFunction(type, program, tokens, match){
        tokens.shift(); // discard keyword
        var signature = grammar.compile.translate(program, null, tokens.shift());
        var args = signature.split(/\s+/);
        var name = "";
        if(type != "lambda")
            name = args.shift();
        if(type != "class"){
            var tail = tokens.pop();
            if(tail)
                tokens.push("return " + tail);
        }
        return makeExpr(program, type,
            "function " + name
                + "(" + args.join(",") + "){"
                + tokens.join(" ") + " }");
    }

    return loosp2js;
})();