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
    var memoryjump = function(e, xref) {
        var types = {
            'byte': 'uint8_t',
            'word': 'uint16_t',
            'dword': 'uint32_t',
            'qword': 'uint64_t'
        }
        if (types[e[1]]) {
            if (xref) {
                return "*((" + types[e[1]] + "*) " + xref + ")"
            }
            return "*((" + types[e[1]] + "*) " + e[2].replace(/\[|\]/g, '') + ")"
        }
        return null;
    };
    var opcodes = {
        'call': function(l, start) {
            var res = memoryjump(l[start].opcode, l[start].getXRef());
            if (res) {
                l[start].opcode = "((void (*)(void)) " + res + ") ();";
            } else if (l[start].getXRef()) {
                l[start].opcode = l[start].getXRef() + " ();";
            } else {
                var fcn = l[start].opcode[1].replace(/\./g, '_');
                if (fcn.indexOf('0x') == 0) {
                    fcn = fcn.replace(/0x/, 'fcn_');
                }
                l[start].opcode = fcn + " ();";
            }
            return l;
        },
        'ret': function(l, start) {
            l[start].opcode = "return;";
            for (var i = start - 1; i >= 0 && i >= start - 4; i--) {
                var e = l[i].opcode;
                if (!e) {
                    continue;
                }
                var regex = e[1].match(/[er]?ax/);
                if (regex) {
                    l[start].opcode = "return " + regex[0] + ";";
                    break;
                }
            };
            return l;
        },
        jmp: function(l, start) {
            var jump = l[start].jump;
            var offset = l[start].offset;
            if (!jump) {
                if (l[start].opcode.length == 3) {
                    var res = memoryjump(l[start].opcode, l[start].getXRef());
                    if (res) {
                        l[start].opcode = "goto " + res + ";";
                    } else {
                        l[start].toAsm(' ');
                    }
                }
            } else if (offset.eq(jump)) {
                l[start].opcode = "while (true);";
                delete(l[start].jump);
            } else {
                l[start].opcode = "goto label_" + offset.toString(16);
                if (jump.gt(offset)) {
                    for (var i = start + 1; i < l.length; i++) {
                        if (l[i].offset.eq(jump)) {
                            l[i].setLabel(true);
                            break;
                        }
                    }
                } else {
                    for (var i = 0; i < offset; i++) {
                        if (l[i] && l[i].offset.eq(jump)) {
                            l[i].setLabel(true);
                            break;
                        }
                    }
                }
            }
            return l;
        },
        hlt: function(l, start) {
            l[start].opcode = "_hlt();";
            return l;
        }
    };
    return function(l) {
        for (var i = 0; i < l.length; ++i) {
            var e = l[i].opcode;
            if (!e || typeof e != 'object') {
                continue;
            }
            if (opcodes[e[0]] != null) {
                l = opcodes[e[0]](l, i);
            }
        }
        return l;
    };
})();