node make-mobile.js
ping 127.0.0.1 -n 2 > nul
copy /Y awi-requires-new.js awi-requires.js
del awi-requires-new.js
browserify C:/Awi/awi-mobile.js -o C:/Awi/apps/mobile/src/js/awi-engine/awi-engine.js --debug