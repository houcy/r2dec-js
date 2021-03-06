/* 
 * Copyright (c) 2017, Giovanni Dante Grazioli <deroad@libero.it>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

module.exports = (function() {
    var mem = {
        'b': function(l, start) {
            var i;
            var offset = 'label_' + l[start].opcode[1].toString(16);
            for (var i = 0; i < l.length; i++) {
                if (start == i) continue;
                if (l[i].offset.eq(l[start].jump)) {
                    l[i].setLabel();
                    break;
                }
            };
            l[start].opcode = 'goto label_' + l[start].jump.toString(16) + ';';
            return l;
        },
        'jr': function(l, start) {
            if (l[start].opcode.indexOf('ra') < 0) {
                return l;
            }
            var reg = null;
            for (var i = l.length - 1; i >= 0; i--) {
                if (!l[i].opcode) continue;
                var e = l[i].opcode;
                if (e.indexOf('v0') == 1 || e.indexOf('v1') == 1) {
                    reg = e[1];
                    break;
                }
            };
            l[start].opcode = "return" + (reg ? " " + reg : "") + ";";
            return l;
        },
        'jalr': function(l, start) {
            /*
            var n = l[start].opcode;
            var reg = "";
            for (var i = start - 1; i >= 0 && i > start - 8; --i) {
                e = l[i].opcode;
                if (n[1] == e[1]) {
                    reg = e[1];
                    l[i].comments.push(to_asm(e));
                    l[i].opcode = "void (*p)(void) = " + reg + ";";
                    break;
                }
            }*/
            l[start].opcode = "((void (*)(void)) " + l[start].opcode[1] + ") ();";
            return l;
        },
        'bal': function(l, start) {
            var fcn = l[start].opcode[1].replace(/\./g, '_');
            if (fcn.indexOf('0x') == 0) {
                fcn = fcn.replace(/0x/, 'fcn_');
            }
            l[start].opcode = fcn + " ();";
            return l;
        },
    };
    return function(l) {
        for (var i = 0; i < l.length; ++i) {
            var e = l[i].opcode;
            if (!e || typeof e != 'object') {
                continue;
            }
            if (mem[e[0]] != null) {
                //l[i].comments.push(to_asm(e));
                l = mem[e[0]](l, i);
            }
        }
        return l;
    };
})();