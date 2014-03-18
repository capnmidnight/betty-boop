// a comment
(define (log)
    (console.log.apply console arguments))

(define obj {a: 1 b: 2 c:{d:3 e:[4 5 6]}})
(log "Object: %o" obj)

(log "the quick brown
    fox jumps over
    the lazy dog.")
(class (Shape width height)
    (set! this.width width)
    (set! this.height height)
    (method (describe)
        (log (this.getType)
             "Area:"
            (* this.width this.height))))

(class (Square:Shape size)
    (base size size))

(define square (new Square 10))
(send square describe)
(log (send square getType))
(set! square null)
(log (send square getType))

(define (f a b c...)
    (log "%s, %s {%s}" a b (c.join " -> ")))

(f "a" "b" "c" 2 3 4 5)

(log [ [ 1 2 3 ]
       [ 4 5 6 ]
       [ 7 8 9 ] ])