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
                var elm = document.createElement("script");
                elm.type = "text/javascript";
                elm.src = "data:text/javascript;base64," + btoa(script);
                document.head.appendChild(elm);
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

        literal: {
            on: "script",
            pattern: /("[^"]*"|\b\d+\.\d+\b|\b\d+\b)/g,
            translate: function (program, tokens, match) {
                if(match[0] == "\"")
                    match = match.replace(/\n/g, "\\n\"\n+\"");
                return makeExpr(program, "literal", match);
            },
            validate: /("[^"]*\n)/g,
            errorMessage: "unterminated string constant"
        },

        array: {
            on: "script",
            pattern: /\[([^\[\]]*)\]/g,
            translate: function (program, tokens, match) {
                return makeExpr(program, "array",
                    "[" + match.substring(1, match.length - 1)
                        .split(/\s+/)
                        .map(function(s){return s.trim();})
                        .filter(function (s){return s.length > 0;})
                        .join(",") + "]");
            },
            validate: /(\[|\])/g,
            errorMessage: "unterminated array literal"
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

        operatorsA: {
            on: "sexpr",
            pattern: /^([+\-%^*\/><]|instanceof|in|>=|<=|!=)(\s+\S+){2,}$/,
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
                return makeExpr(program, "variable", "var " + tokens.shift() + " = " + tokens.shift() + ";\n");
            }
        },

        begin: {
            on: "sexpr",
            pattern: /^begin(\s+[^\s\(\)]+)+$/,
            translate: function (program, tokens, match) {
                tokens.shift(); // discard "for-each"
                var tail = tokens.pop();
                tokens.push("return " + tail);
                var body = tokens.join(";\n ");
                return makeExpr(program, "begin", "(function(){\n" + body + ";\n}).call(this)");
            }
        },

        whileLoop: {
            on: "sexpr",
            pattern: /^while\s+\S+(\s+\S+)+$/,
            translate: function (program, tokens, match) {
                tokens.shift(); // discard "while"
                var cond = tokens.shift();
                var body = tokens.join(";\n ");
                var script = "while(" + cond + "){\n" + body + ";\n}\n";
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
                var body = tokens.join(";\n ");
                return makeExpr(program, "when", "(function(){\nvar _ret; if(" + expr + "){\n" + body + ";\n}\n return _ret;\n}).call(this)");
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
                return makeExpr(program, "ifBlock", "(function(){\nvar _ret;\n if(" + expr + "){\n_ret = " + yes + ";\n}\nelse{\n_ret = " + no + ";\n}\n return _ret;\n}).call(this)");
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
                var body = tokens.join(";\n ");
                return makeExpr(program, "unless", "(function(){\nvar _ret;\n if(!" + expr + "){\n" + body + ";\n}\n return _ret;\n}).call(this)");
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
                return makeExpr(program, "setter", tokens.shift() + " = " + tokens.shift() + ";\n");
            }
        },

        // at this point, just going to assume any left-over s-expressions
        // are function calls.
        call: {
            on: "sexpr",
            pattern: /^(\s*\S+)+$/g,
            translate: function (program, tokens, match) {
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

        cleanupA: {
            on: "script",
            pattern: /(;;)/g,
            translate: function (program, tokens, match) {
                return ";"
            }
        },

        cleanupB: {
            // this will end up replacing all semicolons on their own line,
            // including any that are in the middle of verbatim strings.
            on: "script",
            pattern: /^\s*;\s*$/gm,
            translate: function (program, tokens, match) {
                return ""
            }
        },
    }

    function makeFunction(type, program, tokens, match) {
        tokens.shift(); // discard keyword
        var signature = postProcess.compile.translate(program, null, tokens.shift());
        var args = signature.split(/\s+/);
        var name = "";
        var super1 = "", super2 = "", matches;
        if (type != "lambda")
            name = args.shift();
        if (type != "class") {
            var tail = tokens.pop();
            if (tail)
                tokens.push("return " + tail);
        }
        else{
            // figure out super types
            if (name != "LoospObject") {
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
                    super1 = "LoospObject.call(this);\n";
                    super1 += " this.typeChain.unshift(\"" + name + "\");\n";
                }
                else {
                    super1 = "var base = function(){\n" + super1 + ".apply(this, Array.prototype.slice.call(arguments));\n";
                    super1 += " this.typeChain.unshift(\"" + name + "\");\n}.bind(this);\n";
                }
            }

            // move method definitions out of class body
            var exprs = [], methods = [];
            tokens.forEach(function(exprID){
                var expr = postProcess.compile.translate(program, null, exprID);
                if(expr.search(/^method /) > -1)
                    methods.push(name + "." + exprID);
                else
                    exprs.push(exprID);
            });
            tokens = exprs;
            super2 += methods.join(";\n ") +";\n ";
        }
        var prefix = "";
        if (type == "method")
            prefix = "prototype." + name + " = ";

        //ellipsis
        if(args.length > 0){
            matches = args[args.length - 1].match(/(\S+)\.\.\./);
            if(matches){
                args.pop();
                var argName = matches[1];
                super1 += "var " + argName + " = Array.prototype.slice.call(arguments);\n " + argName + ".splice(0, " + args.length + ");\n";
            }
        }

        return makeExpr(program, type,
            prefix + "function " + name
                + "(" + args.join(",") + "){\n"
                + super1
                + tokens.join(";\n ") + ";\n }\n"
                + super2);
    }

    return loosp2js;
})();