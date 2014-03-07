var loosp2js = (function () {
    "use strict";
    function loosp2js(showScript, script) {
        if (script) {
            return translate(script);
        }
        else {
            var arr = document.querySelectorAll("script[type='text/loosp']");
            for (var i = 0; i < arr.length; ++i) {
                var script = arr[i].innerHTML;
                script = loosp2js(showScript, script);
                if(showScript)
                    console.log(script);
                eval(script);
            }
        }
    }

    function translate(script) {
        var formName, good = true,
            program = { script: ["(class (LoospObject) (set! this.typeChain [\"LoospObject\"]) (method (getType) this.typeChain[0]))\n " + script.trim()] };
        for (var formName in grammar)
            program[formName] = [];
        for (var formName in grammar)
            if(good)
                good = processForm(program, grammar[formName]);
        for (var formName in postProcess)
            if(good)
                good = processForm(program, postProcess[formName]);
        return good ? program.script[0] : "console.error(\"Translation cancelled\");";
    }

    function processForm(program, form) {
        var expr, matches, tokens, expr2, good = true;
        for (var i = 0, l = program[form.on].length; i < l; ++i) {
            expr = program[form.on][i];
            do {
                program[form.on][i] = expr;
                matches = expr.match(form.pattern);
                if (matches) {
                    tokens = expr.split(/\s+/);
                    expr2 = expr.replace(
                        form.pattern,
                        form.translate.bind(form, program, tokens));
                    if (expr2 != expr)
                        expr = expr2
                }
            } while (expr != program[form.on][i])
        }

        if(form.validate){
            for(var i = 0; i < program[form.on].length; ++i){
                program[form.on][i] = program[form.on][i].replace(form.validate, function(match){
                    good = false;
                    return "\n<err>>>> " + match + " <<<<err>\n";
                });
            }
            if(!good){
                for(var i = 0; i < program.sexpr.length; ++i)
                    program.sexpr[i] = "(" + program.sexpr[i] + ")";
                processForm(program, postProcess.compile);
                console.error("Error: %s in: %s", form.errorMessage, program.script[0]);
            }
        }
        return good;
    }

    function makeExpr(program, type, script) {
        var i = program[type].indexOf(script);
        if (i == -1) {
            i = program[type].length;
            program[type].push(script);
        }
        return "#" + type + i + "#";
    }

    var grammar = {

        comments:{
            on: "script",
            pattern: /(\/\/[^\n]*\n|\/\*(.|\n)*\*\/)/g,
            translate: function (program, tokens, match) {
                return makeExpr(program, "comments", match);
            },
            validate: /(\/\*|\*\/)/g,
            errorMessage: "unterminated block comment"
        },

        sexpr: {
            on: "script",
            pattern: /\(([^\(\)])*\)/g,
            translate: function (program, tokens, match) {
                return makeExpr(program, "sexpr",
                    match.replace(/(\(|\))/g, ""));
            },
            validate: /(\(|\))/g,
            errorMessage: "un-matched parenthesis"
        },

        literal: {
            on: "sexpr",
            pattern: /("[^"\n]*"|\@"[^"]*"|\b\d+\.\d+\b|\b\d+\b)/g,
            translate: function (program, tokens, match) {
                if(match[0] == "@")
                    match = match.substring(1).replace(/\n/g, "\\n\"\n+\"");
                return makeExpr(program, "literal", match);
            },
            validate: /("[^"]*\n)/g,
            errorMessage: "unterminated string constant"
        },

        idsA: {
            on: "sexpr",
            pattern: /(\b\S+(-+\S*)+\b)/g,
            translate: function (program, tokens, match) {
                return match.replace(/-/g, "_");
            }
        },

        idsB: {
            on: "sexpr",
            pattern: /\?/g,
            translate: function (program, tokens, match) {
                return match.replace(/\?/g, "Que");
            }
        },

        array: {
            on: "sexpr",
            pattern: /\[(\S+(\s+\S+)*)*\]/,
            translate: function (program, tokens, match) {
                return makeExpr(program, "array",
                    match.split(/\s+/).join(","));
            }
        },

        operatorsA: {
            on: "sexpr",
            pattern: /^([+\-%^*\/><]|instanceof|>=|<=|!=)(\s+\S+){2,}$/,
            translate: function (program, tokens, match) {
                var op = tokens.shift();
                return makeExpr(program, "operatorsA",
                    "(" + tokens.join(" " + op + " ") + ")");
            }
        },

        operatorsB: {
            on: "sexpr",
            pattern: /^(and|or|=)(\s+\S+){2,}$/,
            translate: function (program, tokens, match) {
                var op = tokens.shift();
                if (op == "and") op = "&";
                else if (op == "or") op = "|";
                return makeExpr(program, "operatorsB",
                    "(" + tokens.join(op + op) + ")");
            }
        },

        operatorsC: {
            on: "sexpr",
            pattern: /^(not|-|~)\s+\S+$/,
            translate: function (program, tokens, match) {
                var op = tokens.shift();
                if (op == "not") op = "!";
                var expr = tokens.shift();
                return makeExpr(program, "operatorsC",
                    op + "(" + expr + ")");
            }
        },

        func: {
            on: "sexpr",
            pattern: /^define\s+(#sexpr\d+#)((?:\s+[^\s\(\)]+)+)$/,
            translate: makeFunction.bind(this, "func")
        },

        //this needs to come after func, as it is a more generalized pattern
        // and can break function definitions if it came first. Alternately,
        // we could change the 'define' keyword for functions.
        variable: {
            on: "sexpr",
            pattern: /^define(\s+[^\s\(\)]+){2}$/,
            translate: function (program, tokens, match) {
                tokens.shift(); //discard "define"
                return makeExpr(program, "variable", "var " + tokens.shift() + " = " + tokens.shift() + ";");
            }
        },

        begin: {
            on: "sexpr",
            pattern: /^begin(\s+[^\s\(\)]+)+$/,
            translate: function (program, tokens, match) {
                tokens.shift(); // discard "for-each"
                var tail = tokens.pop();
                tokens.push("return " + tail);
                var body = tokens.join("; ");
                return makeExpr(program, "begin", "(function(){" + body + ";})()");
            }
        },

        whileLoop: {
            on: "sexpr",
            pattern: /^while\s+\S+(\s+\S+)+$/,
            translate: function (program, tokens, match) {
                tokens.shift(); // discard "while"
                var cond = tokens.shift();
                var body = tokens.join("; ");
                var script = "while(" + cond + "){" + body + ";}";
                return makeExpr(program, "whileLoop", script);
            }
        },

        when: {
            on: "sexpr",
            pattern: /^when\s+[^\s\(\)]+(\s+[^\s\(\)]+)+$/,
            translate: function (program, tokens, match) {
                tokens.shift(); // discard "when"
                var expr = tokens.shift();
                var tail = tokens.pop();
                tokens.push("_ret = " + tail);
                var body = tokens.join("; ");
                return makeExpr(program, "when", "(function(){var _ret; if(" + expr + "){" + body + ";} return _ret;})()");
            }
        },

        ifBlock: {
            on: "sexpr",
            pattern: /^if\s+[^\s\(\)]+(\s+#sexpr\d+#){2}$/,
            translate: function (program, tokens, match) {
                tokens.shift(); // discard "if"
                var expr = tokens.shift();
                var yes = tokens.shift();
                var no = tokens.shift();
                return makeExpr(program, "ifBlock", "(function(){var _ret; if(" + expr + "){_ret = " + yes + ";}else{_ret = " + no + ";} return _ret;})()");
            }
        },

        unless: {
            on: "sexpr",
            pattern: /^unless\s+[^\s\(\)]+(\s+[^\s\(\)]+)+$/,
            translate: function (program, tokens, match) {
                tokens.shift(); // discard "unless"
                var expr = tokens.shift();
                var tail = tokens.pop();
                tokens.push("_ret = " + tail);
                var body = tokens.join("; ");
                return makeExpr(program, "unless", "(function(){var _ret; if(!" + expr + "){" + body + ";} return _ret;})()");
            }
        },

        lambda: {
            on: "sexpr",
            pattern: /^lambda\s+#sexpr\d+#(\s+[^\s\(\)]+)+$/,
            translate: makeFunction.bind(this, "lambda")
        },

        class: {
            on: "sexpr",
            pattern: /^class\s+#sexpr\d+#(\s+[^\s\(\)]+)+$/,
            translate: makeFunction.bind(this, "class")
        },

        method: {
            on: "sexpr",
            pattern: /^method\s+#sexpr\d+#(\s+[^\s\(\)]+)+$/,
            translate: makeFunction.bind(this, "method")
        },

        send: {
            on: "sexpr",
            pattern: /^send(\s+[^\s\(\)]+){2,}$/,
            translate: function (program, tokens) {
                tokens.shift(); //discard "send"
                var target = tokens.shift();
                var func = tokens.shift();
                var args = tokens.join(",");
                return makeExpr(program, "send", "((!!" + target + ")?(" + target + "." + func + "(" + args + ")):(undefined))");
            }
        },

        newObject: {
            on: "sexpr",
            pattern: /^new(\s+[^\s\(\)]+)+$/,
            translate: function (program, tokens) {
                tokens.shift(); //discard "new"
                var func = tokens.shift();
                var args = tokens.join(",");
                return makeExpr(program, "newObject", "new " + func + "(" + args + ")");
            }
        },

        setter: {
            on: "sexpr",
            pattern: /^set!(\s+[^\s\(\)]+){2}$/,
            translate: function (program, tokens) {
                tokens.shift(); //discard "set!"
                return makeExpr(program, "setter", tokens.shift() + " = " + tokens.shift() + ";");
            }
        },

        // at this point, just going to assume any left-over s-expressions
        // are function calls.
        call: {
            on: "sexpr",
            pattern: /^(\s*\S+)+$/g,
            translate: function (program, tokens, match) {
                if (tokens[0].indexOf("\n") > 0)
                    console.log(tokens);
                if (tokens.length == 1 && tokens[0].match(/^#[^#\s]+\d+#$/))
                    return tokens[0];
                else {
                    var func = tokens.shift();
                    var args = tokens.join(",");
                    return makeExpr(program, "call", func + "(" + args + ")");
                }
            }
        },

    };

    var postProcess = {

        compile: {
            on: "script",
            pattern: /#([^\s\d]+)(\d+)#/,
            translate: function (program, tokens, match) {
                var matches = match.match(this.pattern);
                var type = matches[1];
                var index = matches[2];
                return program[type][index];
            }
        },

        cleanup: {
            on: "script",
            pattern: /(;;)/,
            translate: function (program, tokens, match) {
                return ";"
            }
        },
    }

    function makeFunction(type, program, tokens, match) {
        tokens.shift(); // discard keyword
        var signature = postProcess.compile.translate(program, null, tokens.shift());
        var args = signature.split(/\s+/);
        var name = "";
        var super1 = "", super2 = "";
        if (type != "lambda")
            name = args.shift();
        if (type != "class") {
            var tail = tokens.pop();
            if (tail)
                tokens.push("return " + tail);
        }
        else if (name != "LoospObject") {
            if (name.indexOf(":") > -1) {
                var parts = name.split(":");
                name = parts.shift();
                super1 = parts.shift();
            }
            else {
                super1 = "LoospObject";
            }
            super2 = name + ".prototype = Object.create(" + super1 + ".prototype);";
            if (super1 == "LoospObject") {
                super1 = "LoospObject.call(this);";
                super1 += " this.typeChain.unshift(\"" + name + "\");";
            }
            else {
                super1 = "var base = function(){" + super1 + ".apply(this, Array.prototype.slice.call(arguments));";
                super1 += " this.typeChain.unshift(\"" + name + "\");}.bind(this);";
            }
        }
        var prefix = "";
        if (type == "method")
            prefix = "if(!this.__proto__." + name + ") this.__proto__." + name + " = ";
        return makeExpr(program, type,
            prefix + "function " + name
                + "(" + args.join(",") + "){"
                + super1
                + tokens.join("; ") + "; }"
                + super2);
    }

    return loosp2js;
})();