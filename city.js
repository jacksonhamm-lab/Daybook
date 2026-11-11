/* Arcadia (the app once called Daybook): the island and its rooms (docs/CITY.md). All 3D is built in code. The HUD lives in a shadow root, so its
   styles and the app's never touch. Everything it says about his data comes from window.CityApp,
   defined in index.html from the app's own functions. Nothing here is saved or synced. */
import * as THREE from 'three';
import { perf, onPerf } from './perf.js';

export const BUILD = 'p21';
if (window.DAYBOOK_BUILD !== BUILD) throw new Error('city.js ' + BUILD + ' does not match index.html ' + window.DAYBOOK_BUILD);
const APP = window.CityApp;

const CSS = `
:host{
  all:initial;display:block;position:fixed;inset:0;z-index:30;
  color-scheme:dark;
  --bg:#05040a;--hud-bg:#0a090d;--hud-s1:#131117;--hud-s2:#1a171f;--hud-s3:#231f29;--hud-plate:rgba(6,6,8,.82);--hud-panel:rgba(6,5,7,.97);
  --hud-text:#ede6d6;--hud-text2:#b8b0a2;--hud-text3:#958d81;
  --hud-red:#ff4646;--hud-red2:#c9423b;--hud-redd:rgba(255,70,70,.5);--hud-red-line:rgba(255,70,70,.46);--hud-red-soft:rgba(255,70,70,.13);
  --hud-cyan:#5ae4ec;--hud-cyan-line:rgba(90,228,236,.55);--hud-cyan-soft:rgba(90,228,236,.14);
  --hud-yellow:#f2dd3d;--hud-green:#4cdc8e;--hud-alert:#ff3d4f;--hud-ink:#0a090d;--hud-hair:rgba(237,230,214,.1);--hud-hair2:rgba(237,230,214,.2);
  --hud-font:"Avenir Next Condensed","DIN Condensed","Bahnschrift SemiCondensed","Arial Narrow",system-ui,sans-serif;--micro:ui-monospace,Menlo,Consolas,monospace;--body:-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',system-ui,sans-serif;
  --ease:cubic-bezier(.2,.8,.2,1);--cut:10px;
  --st:env(safe-area-inset-top,0px);--sb:env(safe-area-inset-bottom,0px);--sl:env(safe-area-inset-left,0px);--sr:env(safe-area-inset-right,0px);
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
:host([hidden]){display:none}
:host{background:var(--bg);overflow:hidden;overscroll-behavior:none;color:var(--hud-text);font-family:var(--body)}
button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
#gl{position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;background:var(--bg)}
#hud{position:fixed;inset:0;pointer-events:none;overflow:hidden;font-family:var(--hud-font);user-select:none;-webkit-user-select:none}
#hud button,#hud a,#hud .pe{pointer-events:auto}
.mi{font-family:var(--micro);font-size:9px;letter-spacing:.06em;color:var(--hud-red);opacity:.72;white-space:nowrap}
.mi.w{color:var(--hud-text3);opacity:1}
.tab{font-family:var(--body);font-weight:700;font-variant-numeric:tabular-nums lining-nums}
[hidden]{display:none!important}

/* top strip */
.top{position:absolute;left:0;right:0;top:0;padding:calc(var(--st) + 8px) calc(var(--sr) + 10px) 14px calc(var(--sl) + 10px);display:flex;align-items:stretch;gap:8px;background:linear-gradient(rgba(5,4,10,.82),rgba(5,4,10,.5) 62%,transparent)}
.frame{--c:var(--hud-red);--f:var(--hud-panel);--ct:8px;position:relative;background:var(--c);clip-path:polygon(0 0,calc(100% - var(--ct)) 0,100% var(--ct),100% 100%,var(--ct) 100%,0 calc(100% - var(--ct)));padding:1px}
.frame>.in{background:var(--f);height:100%;clip-path:polygon(0 0,calc(100% - var(--ct) + .6px) 0,100% calc(var(--ct) - .6px),100% 100%,calc(var(--ct) - .6px) 100%,0 calc(100% - var(--ct) + .6px))}
.brand .in{padding:5px 12px 5px 9px;display:flex;align-items:center;gap:8px}
.brand b{font:700 16px/1 var(--hud-font);letter-spacing:.1em}
.brand i{display:block;width:9px;height:9px;background:var(--hud-red);clip-path:polygon(0 0,100% 0,100% 60%,60% 100%,0 100%)}
.brand small{display:block;font:9px/1 var(--micro);letter-spacing:.08em;color:var(--hud-red);margin-top:3px}
.eqw{flex:1;min-width:0;position:relative}
.eqw .in{display:flex;flex-direction:column;justify-content:center;padding:3px 8px;gap:1px}
.eqw canvas{display:block;width:100%;height:26px}
.eqw .row{display:flex;justify-content:space-between;gap:6px;overflow:hidden}
.clk{min-width:82px}
.clk .in{padding:3px 12px 3px 9px;text-align:right;display:flex;flex-direction:column;justify-content:center}
.clk b{font:700 17px/1 var(--body);font-variant-numeric:tabular-nums lining-nums;color:var(--hud-text)}
.q{width:44px;min-height:44px;position:relative;align-self:stretch}
.q span{position:absolute;inset:0;display:grid;place-items:center;font:700 13px/1 var(--hud-font);letter-spacing:.06em;color:var(--hud-cyan);box-shadow:inset 0 0 0 1px var(--hud-cyan-line);background:linear-gradient(315deg,var(--hud-cyan) 0 5px,transparent 0),rgba(10,9,13,.82)}
.q[aria-pressed=true] span{background:linear-gradient(315deg,var(--hud-cyan) 0 5px,transparent 0),var(--hud-cyan-soft)}

/* perf readout */
#perf{position:absolute;right:calc(var(--sr) + 10px);top:calc(var(--st) + 66px);width:188px;z-index:6}
#perf .in{padding:8px 10px;font:11px/1.45 var(--micro);color:var(--hud-text2)}
#perf b{color:var(--hud-cyan);font-weight:400;float:right}
#perf h4{margin:0 0 4px;font:700 13px/1 var(--hud-font);letter-spacing:.1em;color:var(--hud-red)}

/* floating district icons */
.ic{position:absolute;left:0;top:0;width:88px;height:44px;display:flex;align-items:center;gap:0;will-change:transform;transition:opacity .25s;--k:var(--hud-red);text-align:left}
.ic.hot{--k:var(--acc)}
.ic .plate{display:grid;place-items:center;width:24px;height:24px;flex:none;color:var(--k);background:
 linear-gradient(var(--k),var(--k)) 0 0/6px 1px no-repeat,linear-gradient(var(--k),var(--k)) 0 0/1px 6px no-repeat,
 linear-gradient(var(--k),var(--k)) 100% 0/6px 1px no-repeat,linear-gradient(var(--k),var(--k)) 100% 0/1px 6px no-repeat,
 linear-gradient(var(--k),var(--k)) 0 100%/6px 1px no-repeat,linear-gradient(var(--k),var(--k)) 0 100%/1px 6px no-repeat,
 linear-gradient(var(--k),var(--k)) 100% 100%/6px 1px no-repeat,linear-gradient(var(--k),var(--k)) 100% 100%/1px 6px no-repeat,rgba(6,6,8,.72)}
.ic svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:square}
.ic .lab{display:block;margin-left:1px;padding:2px 6px 2px 5px;background:var(--hud-plate);font:700 11.5px/1.05 var(--hud-font);letter-spacing:.09em;text-transform:uppercase;color:var(--hud-text);box-shadow:inset 0 -1px 0 var(--k);white-space:nowrap}
.ic .lab small{display:block;font:8px/1.1 var(--micro);letter-spacing:.04em;color:var(--k);margin-top:1px}
.ic .edgea{position:absolute;top:50%;width:0;height:0;margin-top:-5px;border:5px solid transparent;opacity:0}
/* a place off the screen keeps its whole pin, docked at that edge, with an arrow pointing the way */
.ic.el,.ic.er{width:auto}
.ic.el{padding-left:11px}.ic.er{padding-right:11px}
.ic.el .tk,.ic.er .tk{display:none}
.ic.el .edgea,.ic.er .edgea{opacity:1;margin-top:-6px;filter:drop-shadow(0 0 3px var(--k))}
.ic.el .edgea{left:0;border-width:6px 7px 6px 0;border-color:transparent var(--k) transparent transparent}
.ic.er .edgea{right:0;border-width:6px 0 6px 7px;border-color:transparent transparent transparent var(--k)}
#leaders{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:hidden}
#leaders path{fill:none;stroke:var(--hud-red);stroke-width:1;opacity:.75}
#leaders rect{fill:none;stroke:var(--hud-red);stroke-width:1}
#leaders .hot{stroke:var(--acc)}
.ic .tk,.tag .tk{position:absolute;inset:6px auto auto -4px;width:32px;height:32px;pointer-events:none;opacity:0;transform:scale(1.12);transition:.14s var(--ease);--t:var(--k);background:
 linear-gradient(var(--t),var(--t)) 0 0/9px 1.5px no-repeat,linear-gradient(var(--t),var(--t)) 0 0/1.5px 9px no-repeat,
 linear-gradient(var(--t),var(--t)) 100% 0/9px 1.5px no-repeat,linear-gradient(var(--t),var(--t)) 100% 0/1.5px 9px no-repeat,
 linear-gradient(var(--t),var(--t)) 0 100%/9px 1.5px no-repeat,linear-gradient(var(--t),var(--t)) 0 100%/1.5px 9px no-repeat,
 linear-gradient(var(--t),var(--t)) 100% 100%/9px 1.5px no-repeat,linear-gradient(var(--t),var(--t)) 100% 100%/1.5px 9px no-repeat}
.ic:hover .tk,.ic:focus-visible .tk,.ic.hot .tk{opacity:1;transform:none}
.ic.live .plate{--k:var(--hud-cyan)}
.ic .live{position:absolute;left:21px;top:7px;width:5px;height:5px;background:var(--hud-yellow);z-index:1;animation:lv 1.4s steps(2) infinite}
@keyframes lv{50%{opacity:.25}}
:focus-visible{outline:2px solid var(--hud-cyan);outline-offset:2px}

/* description boxes */
.dbox{position:absolute;--ct:12px}
.dbox .in{display:grid}
.dhead{display:flex;align-items:center;gap:8px;padding:4px 16px 4px 9px;border-bottom:1px solid var(--hud-red-line);background:linear-gradient(90deg,var(--hud-red) 0 3px,transparent 3px)}
.tickr{height:5px;background:repeating-linear-gradient(90deg,var(--hud-red) 0 1px,transparent 1px 25px) 0 0/100% 5px no-repeat,repeating-linear-gradient(90deg,var(--hud-red-line) 0 1px,transparent 1px 5px) 0 0/100% 3px no-repeat;opacity:.8}
.nums{font:8.5px/1 var(--micro);letter-spacing:.05em;color:var(--hud-red);opacity:.8;white-space:nowrap;display:flex;gap:6px;align-items:center}
.nums i{width:3px;height:3px;background:var(--hud-red);display:block}
.cells{display:grid;grid-auto-flow:row;gap:2px}
.cells i{display:block;height:3px;box-shadow:inset 0 0 0 1px var(--hud-red-line)}
.cells i.on{background:var(--hud-red);box-shadow:none}
.dhead b{font:700 14px/1.1 var(--hud-font);letter-spacing:.1em;white-space:nowrap}
.sq{display:flex;gap:2px;margin-left:auto}
.sq i{display:block;width:7px;height:7px;background:var(--hud-red);opacity:.2}
.sq i.on{opacity:1}
.dgrid{display:grid;grid-template-columns:92px 1fr}
.dcol{padding:6px 8px;border-right:1px solid var(--hud-red-line);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}
.dcol2{padding:6px 8px 5px;min-width:0;display:flex;flex-direction:column;gap:4px}
.ring{position:relative;width:74px;height:74px}
.ring svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}
.ring b{position:absolute;inset:0;display:grid;place-items:center;font:700 25px/1 var(--hud-font);color:var(--hud-text)}
.ring small{position:absolute;left:0;right:0;bottom:15px;text-align:center;font:8px/1 var(--micro);color:var(--hud-red)}
.pl{align-self:flex-start;background:var(--hud-red);color:var(--hud-ink);font:700 13px/1 var(--hud-font);letter-spacing:.11em;padding:3px 10px 3px 8px;clip-path:polygon(0 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.rw{display:flex;align-items:center;gap:6px;font:600 12px/1 var(--hud-font);letter-spacing:.07em;color:var(--hud-text2);white-space:nowrap}
.rw>span:first-child{width:50px;flex:none}
.rw .bar{flex:1;display:flex;gap:1.5px;min-width:0;height:8px}
.rw .bar i{flex:1;background:var(--hud-red);opacity:.17;min-width:0}
.rw .bar i.on{opacity:1}
.rw .bar.y i{background:var(--hud-yellow)}
.rw .bar.c i{background:var(--hud-cyan)}
.rw em{font:700 12px/1 var(--body);font-style:normal;font-variant-numeric:tabular-nums lining-nums;color:var(--hud-text);min-width:22px;text-align:right}
.dfoot{display:flex;align-items:center;gap:8px;padding:4px 16px 5px 9px;border-top:1px solid var(--hud-red-line);min-width:0}
.load{flex:1;height:5px;background:var(--hud-red-soft);position:relative;min-width:40px}
.load i{position:absolute;left:0;top:0;bottom:0;background:var(--hud-red)}
.load i::after{content:'';position:absolute;right:-6px;top:0;bottom:0;width:3px;background:var(--hud-red)}
.hatch{width:44px;height:12px;flex:none;background:repeating-linear-gradient(-45deg,var(--hud-red) 0 1.5px,transparent 1.5px 4px);opacity:.75}
.exd{font:600 11px/1 var(--hud-font);letter-spacing:.08em;color:var(--hud-ink);background:var(--hud-yellow);padding:2px 5px;white-space:nowrap}
.mini{height:15px;flex:none;width:58px;display:block}
.dots{display:flex;gap:3px;align-items:center}
.dots i{width:5px;height:5px;border-radius:50%;background:var(--hud-green)}
.dots i.o{background:var(--hud-red);opacity:.4}
#cityBox{left:calc(var(--sl) + 10px);right:calc(var(--sr) + 10px);bottom:calc(var(--sb) + 10px)}
#cityBox.slim .tickr,#cityBox.slim .dgrid,#cityBox.slim .dfoot{display:none}
#cityBox.slim .dhead{min-height:46px;align-items:center}
.dtog{position:absolute;inset:0;background:none;border:0;padding:0;margin:0;cursor:pointer;display:none;-webkit-tap-highlight-color:transparent;z-index:2}
.dtog::after{content:'';position:absolute;right:14px;top:17px;width:8px;height:8px;border-right:2px solid var(--hud-red);border-top:2px solid var(--hud-red);transform:rotate(-45deg);transition:transform .18s}
#cityBox:not(.slim) .dtog::after{transform:rotate(135deg);top:13px}
#cityBox:not(.slim) .dtog{bottom:auto;height:44px}
@media (max-width:899px){.dtog{display:block}#cityBox.slim .sq{margin-right:26px}}
#dataBox{display:none}
.sel{font:700 15px/1 var(--hud-font);letter-spacing:.05em;color:var(--hud-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* side rails */
.ladder{position:absolute;top:50%;width:46px;height:210px;margin-top:-105px;display:none}
.ladder svg{width:100%;height:100%}

/* room mode */
#roomTop{display:flex;gap:8px;align-items:stretch}
.back{width:48px;min-height:44px;position:relative}
.back span{position:absolute;inset:0;display:grid;place-items:center;box-shadow:inset 0 0 0 1px var(--hud-cyan-line);color:var(--hud-cyan);background:linear-gradient(315deg,var(--hud-cyan) 0 5px,transparent 0),rgba(10,9,13,.86)}
.back svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2}
.tag{position:absolute;left:0;top:0;min-width:44px;min-height:44px;will-change:transform;--k:var(--hud-cyan);transition:opacity .22s;display:block}
.tag .lbl{display:block;background:var(--k);clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px);padding:1.5px}
.tag .lbl>span{display:flex;align-items:center;gap:7px;padding:5px 10px 5px 9px;background:#0b0a10;clip-path:polygon(6.4px 0,100% 0,100% calc(100% - 6.4px),calc(100% - 6.4px) 100%,0 100%,0 6.4px);white-space:nowrap}
.tag b{font:700 14.5px/1 var(--hud-font);letter-spacing:.09em;color:var(--hud-text)}
.tag small{font:700 12px/1 var(--body);font-variant-numeric:tabular-nums;color:var(--hud-cyan)}
.tag .key{font:600 11px/1 var(--hud-font);color:var(--hud-ink);background:var(--hud-cyan);padding:2px 4px}
.tag .ln{position:absolute;left:16px;top:100%;width:1px;background:var(--k);height:var(--h,26px);transform-origin:top;pointer-events:none}
.tag .ln::after{content:'';position:absolute;left:-3px;bottom:-3px;width:7px;height:7px;box-shadow:0 0 0 1.5px var(--k);background:transparent}
.tag .tk{inset:-5px;width:auto;height:auto;--t:var(--k)}
.tag:hover .tk,.tag:focus-visible .tk,.tag.hot .tk{opacity:1;transform:none}
.tag.on{--k:var(--hud-green)}
#roomBox{left:calc(var(--sl) + 10px);right:calc(var(--sr) + 10px);bottom:calc(var(--sb) + 10px)}
#aptBox{left:calc(var(--sl) + 10px);right:calc(var(--sr) + 10px);bottom:calc(var(--sb) + 10px)}
#aptBox .dhead{padding-right:6px}
#aptBox .rbtn{margin-left:auto}
/* the panel takes the sheet's touches, so a swipe scrolls it and a tap can't reach the rows hidden behind it */
#hud #sheet.open{pointer-events:auto}
#hud[data-room=apartment] .cards{grid-template-columns:minmax(0,1fr)}
#hud.room[data-room=apartment] .q,#hud.room[data-room=apartment] .back{flex:none}
#hud.room[data-room=apartment] .brand{min-width:0}
#hud.room[data-room=apartment] .brand b{display:block;overflow:hidden;text-overflow:ellipsis}
@media (max-width:430px){#hud.room[data-room=apartment] .eqw{display:none}#hud.room[data-room=apartment] .brand{flex:1}}
/* the gym: today's session over the week, and its sheet's cards */
#gymBox{left:calc(var(--sl) + 10px);right:calc(var(--sr) + 10px);bottom:calc(var(--sb) + 10px)}
#gymBox .dhead{padding-right:6px}
#gymBox .rbtn{margin-left:auto}
#gymBox .dhead .mi{margin-left:10px}
#chBox{left:calc(var(--sl) + 10px);right:calc(var(--sr) + 10px);bottom:calc(var(--sb) + 10px)}
#chBox .dhead{padding-right:6px}
#chBox .rbtn{margin-left:auto}
#chBox .dhead .mi{margin-left:10px}
#chBox .gyb{display:grid;gap:7px}
/* the castle: the week's study, what's due, the clock; its sheet's cards */
#scBox{left:calc(var(--sl) + 10px);right:calc(var(--sr) + 10px);bottom:calc(var(--sb) + 10px)}
#scBox .dhead{padding-right:6px}
#scBox .rbtn{margin-left:auto}
#scBox .dhead .mi{margin-left:10px}
#scBox .gyb{display:grid;gap:7px}
#scBox.live #vS3{color:var(--hud-green)}
.cswk button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 0;min-height:44px;box-shadow:inset 0 0 0 1px var(--hud-hair);color:inherit}
.cswk button b{font:600 9px/1 var(--micro);letter-spacing:.06em;color:var(--hud-text3)}
.cswk button span{font:700 13px/1 var(--hud-font);letter-spacing:.04em;color:var(--hud-text2)}
.cswk button.on{box-shadow:inset 0 -3px 0 var(--c),inset 0 0 0 1px var(--hud-hair)}
.cswk button.on span{color:var(--hud-text)}
.cswk button.td{box-shadow:inset 0 0 0 1.5px var(--hud-yellow)}
.cswk button.td.on{box-shadow:inset 0 -3px 0 var(--c),inset 0 0 0 1.5px var(--hud-yellow)}
.cswk button.sel{background:var(--hud-s2)}
.csnav{margin-bottom:8px}
.sedg.css{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 48px;align-items:end;margin-top:6px}
.sedg.css label.cc{grid-column:1/3}
.sedg.css>.rbtn{grid-column:3;grid-row:1/3;align-self:stretch;padding:0}
.csadd{display:grid;gap:7px;margin:4px 0 8px}
.csri{grid-template-columns:30px minmax(0,1fr) auto}
.csri>button:first-child{display:grid;place-items:center;min-height:40px}
.csc b small{font:500 11px var(--body);color:var(--hud-text3);margin-left:6px}
.csc.on i{color:var(--hud-ink)}
.git.csc.on b{opacity:1;text-decoration:none}
.ptr{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;height:96px;align-items:end}
.ptr i{position:relative;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px;font-style:normal}
.ptr i span{width:70%;min-height:2px;background:var(--hud-cyan-soft);box-shadow:inset 0 0 0 1px var(--hud-cyan-line)}
.ptr i.cur span{background:var(--hud-yellow)}
.ptr i b{font:700 11px/1 var(--hud-font);color:var(--hud-text)}
.ptr i em{font:600 8px/1 var(--micro);font-style:normal;letter-spacing:.04em;color:var(--hud-text3)}
.csce{margin-top:6px}
.git{width:100%;display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:8px;align-items:center;min-height:44px;border-top:1px solid var(--hud-hair);text-align:left;color:var(--hud-text)}
.git i,.rcr .pk i{width:22px;height:22px;display:grid;place-items:center;font:700 13px/1 var(--hud-font);font-style:normal;color:transparent;box-shadow:inset 0 0 0 1.5px var(--hud-cyan-line)}
.git.on i,.rcr.on .pk i{background:var(--hud-cyan);color:var(--hud-ink);box-shadow:none}
.git b{font:600 14px/1.2 var(--body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.git.on b{opacity:.5;text-decoration:line-through}
.git em{font:600 10px/1 var(--micro);font-style:normal;letter-spacing:.04em;color:var(--hud-text3);white-space:nowrap}
.gsec{margin:12px 0 2px;font:700 11px/1 var(--hud-font);letter-spacing:.12em;color:var(--hud-yellow)}
.gsec:first-child{margin-top:2px}
.rcr{display:grid;grid-template-columns:44px minmax(0,1fr);align-items:center;border-top:1px solid var(--hud-hair)}
.rcr .pk{width:44px;height:44px;display:grid;place-items:center}
.rcr .op{min-height:48px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;text-align:left;color:var(--hud-text);padding-right:2px}
.rcr .op b{display:block;font:600 14px/1.2 var(--body);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rcr .op small{display:block;margin-top:3px;font:9px/1 var(--micro);letter-spacing:.05em;color:var(--hud-text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rcr .op em{font:700 13px/1 var(--hud-font);font-style:normal;color:var(--hud-yellow)}
.fcats{margin-bottom:6px}
.rch{margin:12px 0 4px;font:700 11px/1 var(--hud-font);letter-spacing:.12em;color:var(--hud-yellow)}
.rct{font:600 18px/1.2 var(--body);color:var(--hud-text);margin:8px 0 2px}
.rcm{font:12px/1.4 var(--body);color:var(--hud-text3);margin:4px 0 0}
.mac{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin:10px 0 2px}
.mac div{box-shadow:inset 0 0 0 1px var(--hud-hair);padding:8px 0;text-align:center}
.mac b{display:block;font:700 15px/1 var(--hud-font);color:var(--hud-text)}
.mac span{display:block;margin-top:4px;font:9px/1 var(--micro);letter-spacing:.06em;color:var(--hud-text3)}
.rci,.rcs{margin:2px 0 0;padding-left:18px;font:13px/1.45 var(--body);color:var(--hud-text2)}
.rcs li{margin-top:5px}
.rcs b{color:var(--hud-text);font-weight:600;margin-right:4px}
.rcg{margin:8px 0 0;font:600 9px/1 var(--micro);letter-spacing:.06em;color:var(--hud-text3);text-transform:uppercase}
.shk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.shk button{min-height:68px;display:grid;place-content:center;gap:6px;text-align:center;font:700 15px/1 var(--hud-font);letter-spacing:.08em;color:var(--hud-cyan);box-shadow:inset 0 0 0 1.5px var(--hud-cyan-line)}
.shk button.on{background:var(--hud-cyan);color:var(--hud-ink);box-shadow:none}
.shk small{font:9px/1 var(--micro);letter-spacing:.06em;opacity:.85}
.cdf{display:grid;gap:7px}
.cdf .cdn{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:6px}
.clg{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;min-height:40px;border-top:1px solid var(--hud-hair);font:13px/1.2 var(--body);color:var(--hud-text)}
.clg b{font-weight:600}
.clg em{font:600 10px/1 var(--micro);font-style:normal;letter-spacing:.05em;color:var(--hud-text3)}
#hud[data-room=gym] .cards{grid-template-columns:minmax(0,1fr)}
#hud.room[data-room=gym] .q,#hud.room[data-room=gym] .back{flex:none}
#hud.room[data-room=gym] .brand{min-width:0}
@media (max-width:430px){#hud.room[data-room=gym] .eqw{display:none}#hud.room[data-room=gym] .brand{flex:1}}
.gyb{padding:6px 9px 8px;display:grid;gap:6px}
#gyName{color:var(--hud-text);opacity:1;overflow:hidden;text-overflow:ellipsis}
.gwk{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
.gwk i{display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 0 6px;font-style:normal;box-shadow:inset 0 0 0 1px var(--hud-hair)}
.gwk i b{font:600 9px/1 var(--micro);letter-spacing:.06em;color:var(--hud-text3)}
.gwk i span{font:700 13px/1 var(--hud-font);letter-spacing:.04em;color:var(--hud-text2)}
.gwk i.on{box-shadow:inset 0 -3px 0 var(--c),inset 0 0 0 1px var(--hud-hair)}
.gwk i.on span{color:var(--hud-text)}
.gwk i.td{box-shadow:inset 0 0 0 1.5px var(--hud-yellow)}
.gwk i.td.on{box-shadow:inset 0 -3px 0 var(--c),inset 0 0 0 1.5px var(--hud-yellow)}
.ssh{display:flex;gap:10px;align-items:center;margin-bottom:8px}
.ssh>b{font:700 20px/1 var(--hud-font);color:var(--hud-ink);background:var(--c);padding:7px 8px;flex:none}
.ssh strong{display:block;font:600 16px/1.2 var(--body);color:var(--hud-text)}
.ssh small{display:block;margin-top:2px;font:12px/1.3 var(--body);color:var(--hud-text2)}
.exr{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;min-height:42px;border-top:1px solid var(--hud-hair)}
.exr:first-child{border-top:0}
.exr b{display:block;font:600 14px/1.25 var(--body);color:var(--hud-text)}
.exr small{display:block;margin-top:4px;font:11px/1.1 var(--micro);letter-spacing:.05em;color:var(--hud-text2)}
/* the session in its sections, as the program lists it: each with its own count */
.exh{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin:16px 0 2px;padding-bottom:5px;border-bottom:1px solid var(--c);font:700 11px/1 var(--micro);letter-spacing:.1em;color:var(--c)}
.exh:first-child{margin-top:4px}
.exh em{font-style:normal;font-weight:600;color:var(--hud-text2)}
.exh.done em{color:var(--c)}
.exh+.exr{border-top:0}
/* a name with a coaching note: tap it to show the note */
.exq{display:block;width:100%;padding:8px 0;text-align:left;background:none;border:0;color:inherit;cursor:pointer}
.exq b::after{content:' +';color:var(--hud-cyan);font-weight:700}
.exr.open .exq b::after{content:' \\2212'}
.exd{display:none;grid-column:1/-1;margin:0 0 10px;padding-left:10px;font:13px/1.4 var(--body);color:var(--hud-text2);white-space:normal;background:none;box-shadow:inset 2px 0 0 var(--hud-cyan-line)}
.exr.open .exd{display:block}
.exn{margin-top:14px;padding:10px 12px;font:13px/1.4 var(--body);color:var(--hud-text2);box-shadow:inset 2px 0 0 var(--c)}
.exr>span{display:flex;gap:4px}
.exr.warm b{color:var(--hud-text2);font-weight:500}
.exr.done b{opacity:.55}
.st{width:40px;height:40px;display:grid;place-items:center;font:700 14px/1 var(--hud-font);color:var(--hud-cyan);box-shadow:inset 0 0 0 1.5px var(--hud-cyan-line);clip-path:polygon(0 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%);transition:background .12s,color .12s}
.st.on{background:var(--hud-cyan);color:var(--hud-ink);box-shadow:none}
.exr.warm .st{--hud-cyan:var(--hud-text3)}
.bnf{display:flex;gap:6px;grid-column:1/-1;padding-bottom:9px}
.bnf input{flex:1;min-width:0;min-height:44px;padding:0 10px;font:600 16px/1 var(--body);color:var(--hud-text);background:var(--hud-s2);border:0;box-shadow:inset 0 0 0 1px var(--hud-hair2);border-radius:0;-webkit-appearance:none;appearance:none}
.bnf input:focus{outline:none;box-shadow:inset 0 0 0 1.5px var(--hud-cyan)}
.bnf input::placeholder{color:var(--hud-text3);font-size:12px;letter-spacing:.08em}
.wk.sel b{box-shadow:inset 0 -2px 0 var(--hud-red)}
/* the rooms' own editors: fields in the HUD's style */
.hin{width:100%;min-width:0;min-height:44px;padding:0 10px;font:600 16px/1.3 var(--body);color:var(--hud-text);background:var(--hud-s2);border:0;border-radius:0;box-shadow:inset 0 0 0 1px var(--hud-hair2);-webkit-appearance:none;appearance:none}
textarea.hin{padding:10px;resize:vertical;min-height:64px;display:block}
.hin:focus{outline:none;box-shadow:inset 0 0 0 1.5px var(--hud-cyan)}
.hin::placeholder{color:var(--hud-text3);font-size:12px;letter-spacing:.08em}
input.hin[type=time],input.hin[type=number]{font-variant-numeric:tabular-nums;color-scheme:dark}
.hadd{display:flex;gap:6px;margin-top:9px;align-items:flex-start}
.nadd{margin:0 0 8px}
.ted{grid-column:1/-1;padding:2px 0 10px 44px;display:grid;gap:7px}
.tacts{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.tacts .rbtn,.sed .rbtn{min-height:40px;padding:0 11px}
.tm{display:flex;align-items:center;gap:6px;font:600 10px/1 var(--micro);letter-spacing:.06em;color:var(--hud-text3)}
.tm .hin{width:118px;min-height:40px}
.rbtn.dng{color:var(--hud-alert);box-shadow:inset 0 0 0 1px rgba(255,61,79,.45);background:linear-gradient(315deg,var(--hud-alert) 0 5px,transparent 0)}
.trow.open{background:var(--hud-s2)}
.trow.open .ttl b{white-space:normal}
.nhit{display:block;width:100%;text-align:left;min-height:30px}
.nrow.open{background:var(--hud-s2);padding:7px 8px}
.ned{display:grid;gap:7px;padding:4px 0 10px}
.sed{margin-top:10px;padding-top:9px;border-top:1px solid var(--hud-red-line);display:grid;gap:8px}
.sedh{display:flex;justify-content:space-between;align-items:baseline;font:700 13px/1 var(--hud-font);letter-spacing:.08em;color:var(--hud-text)}
.sedh em{font-style:normal;color:var(--hud-text2)}
.sedg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.sedg label{display:grid;gap:4px;font:600 9px/1 var(--micro);letter-spacing:.06em;color:var(--hud-text3);min-width:0}
.sh.sel{box-shadow:inset 2px 0 0 var(--hud-red);background:var(--hud-s2)}
/* the sheet's global cards (quick add, progress, system) show alone, and the room's cards without them */
#sheet:not(.g) .card[data-g],#sheet.g .card:not([data-g]),#sheet .card[data-g]:not(.on){display:none}
.qprev{margin-top:8px;min-height:40px;display:grid;gap:5px;font:13px/1.3 var(--body);color:var(--hud-text2)}
.qprev b{font:600 15px/1.2 var(--body);color:var(--hud-text)}
.qprev .pills{display:flex;flex-wrap:wrap;gap:5px}
.qprev .pills span{font:600 10px/1 var(--micro);letter-spacing:.05em;padding:4px 6px;color:var(--hud-ink);background:var(--k,var(--hud-cyan))}
.gtr{display:grid;gap:4px;margin-top:8px}
.gtr div{display:grid;grid-template-columns:18px minmax(0,1fr);gap:8px;align-items:start;padding:6px 0;border-top:1px solid var(--hud-hair);font:12px/1.3 var(--body);color:var(--hud-text3)}
.gtr div i{width:12px;height:12px;margin-top:2px;box-shadow:inset 0 0 0 1.5px var(--hud-text3)}
.gtr div.got i{background:var(--hud-yellow);box-shadow:none}
.gtr div b{display:block;font:600 14px/1.2 var(--body);color:var(--hud-text2)}
.gtr div.got b{color:var(--hud-text)}
.sgp{border-top:1px solid var(--hud-hair);padding:8px 0}
.sgp:first-child{border-top:0}
.sgp>b{display:block;font:700 12px/1 var(--hud-font);letter-spacing:.1em;color:var(--hud-text);margin-bottom:7px}
.sgp p{margin:6px 0 0;font:12px/1.35 var(--body);color:var(--hud-text3)}
.sgg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.sgg label{display:grid;gap:4px;font:600 9px/1 var(--micro);letter-spacing:.06em;color:var(--hud-text3);min-width:0}
.sgg label.w{grid-column:1/-1}
.tcat:not(.ol){background:var(--k);color:var(--hud-ink)}
.tcat.ol{box-shadow:inset 0 0 0 1px var(--k)}
select.hin{color-scheme:dark}
.seg2{display:flex;flex-wrap:wrap;gap:6px}
.seg2 .rbtn{min-height:40px;padding:0 11px}
.vh{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
label.rbtn{cursor:pointer}
.vh:focus-visible+label.rbtn{outline:2px solid var(--hud-cyan);outline-offset:2px}
.gswap{margin-top:10px}
.gswap .rbtn{min-width:52px}
.gtpl{display:grid;gap:6px}
.gtpl label{display:grid;grid-template-columns:42px minmax(0,1fr);gap:8px;align-items:center;font:700 13px/1 var(--hud-font);letter-spacing:.08em;color:var(--hud-text)}
.jrow{padding:8px 0;border-top:1px solid var(--hud-hair);display:grid;gap:6px}
.jrow:first-child{border-top:0}
.jrow .jt{display:flex;align-items:baseline;gap:8px;min-width:0}
.jrow .jt b{font:600 14px/1.2 var(--body);color:var(--hud-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.jrow .jt small{font:9px/1 var(--micro);letter-spacing:.05em;color:var(--hud-text3);white-space:nowrap}
.jrow .jt a{margin-left:auto;font:700 11px/1 var(--hud-font);letter-spacing:.08em;color:var(--hud-cyan);text-decoration:none;padding:8px 0 8px 8px}
.jst{display:flex;flex-wrap:wrap;gap:4px}
.jst button{min-height:32px;padding:0 8px;font:700 10px/1 var(--hud-font);letter-spacing:.08em;color:var(--hud-text3);box-shadow:inset 0 0 0 1px var(--hud-hair2)}
.jst button.on{color:var(--hud-ink);background:var(--k);box-shadow:none}
.jadd{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:9px}
.jadd input[name=link]{grid-column:1/-1}
.jadd .rbtn{grid-column:1/-1}
.cd{display:inline-block;min-width:28px;margin-right:7px;padding:3px 4px;font:700 11px/1 var(--hud-font);font-style:normal;text-align:center;color:var(--hud-ink);background:var(--c)}
.bn{display:grid;grid-template-columns:minmax(0,1fr) 72px 70px;gap:8px 8px;align-items:center;min-height:50px;padding-top:8px;border-top:1px solid var(--hud-hair)}
.bn:first-child{border-top:0}
.bn b{display:block;font:700 13px/1.1 var(--hud-font);letter-spacing:.08em;color:var(--hud-text)}
.bn small{display:block;margin-top:4px;font:9px/1 var(--micro);letter-spacing:.05em;color:var(--hud-text3)}
.bn svg{width:72px;height:24px;display:block}
.bn em{font:700 24px/1 var(--hud-font);font-style:normal;color:var(--hud-text);text-align:right;white-space:nowrap}
.bn em small{display:inline;margin-left:3px}
.rst{font:700 54px/1 var(--body);font-variant-numeric:tabular-nums;color:var(--hud-text);margin:4px 0 2px}
.rst.on{color:var(--hud-yellow)}
.aptl{max-height:min(132px,18vh);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:0 8px 0 4px}
.trow{display:grid;grid-template-columns:44px minmax(0,1fr);align-items:stretch;border-top:1px solid var(--hud-hair)}
.trow:first-child{border-top:0}
.tick{min-height:44px;display:grid;place-items:center}
.tick i{display:block;width:20px;height:20px;box-shadow:inset 0 0 0 1.5px var(--c,var(--hud-cyan));clip-path:polygon(0 0,100% 0,100% calc(100% - 5px),calc(100% - 5px) 100%,0 100%);transition:background .12s}
.trow.done .tick i{background:var(--c,var(--hud-cyan))}
.ttl{min-width:0;text-align:left;padding:6px 6px 6px 0;display:flex;flex-direction:column;justify-content:center;gap:3px}
.ttl b{font:600 14px/1.15 var(--body);color:var(--hud-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ttl small{font:9px/1 var(--micro);letter-spacing:.05em;color:var(--hud-text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.trow.done .ttl b{opacity:.5;text-decoration:line-through}
.none{padding:12px 9px;font:13px/1.3 var(--body);color:var(--hud-text2)}
.wk{width:100%;text-align:left;display:grid;grid-template-columns:42px 26px minmax(0,1fr) auto;gap:8px;align-items:center;min-height:44px;border-top:1px solid var(--hud-hair);font:13px/1.2 var(--body);color:var(--hud-text2)}
.wk:first-of-type{border-top:0}
.wk b{font:700 13px/1 var(--hud-font);letter-spacing:.08em;color:var(--hud-text)}
.wk.today b{background:var(--hud-yellow);color:var(--hud-ink);padding:3px 4px;text-align:center}
.wk span{font-weight:700;font-variant-numeric:tabular-nums;color:var(--hud-text)}
.wk div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wk em{font-style:normal;font-weight:700;font-variant-numeric:tabular-nums;color:var(--hud-text);text-align:right}
.wk.sel{box-shadow:inset 2px 0 0 var(--hud-red);background:var(--hud-s2)}
.nrow{width:100%;text-align:left;display:block;min-height:44px;padding:7px 2px;border-top:1px solid var(--hud-hair)}
.nrow:first-of-type{border-top:0}
.nrow b{display:block;font:600 14px/1.2 var(--body);color:var(--hud-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nrow p{margin:3px 0 0;font:12px/1.3 var(--body);color:var(--hud-text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nrow small{display:block;margin-top:3px;font:9px/1 var(--micro);letter-spacing:.05em;color:var(--hud-text3)}
.dcd{padding:8px 0;border-top:1px solid var(--hud-hair)}
.dcd:first-child{border-top:0}
.dcd b{display:block;font:600 14px/1.2 var(--body);color:var(--hud-text);overflow-wrap:anywhere}
.dcd small{display:block;margin-top:3px;font:12px/1.2 var(--body);color:var(--hud-text2)}
#roomBox .bigt{font:700 28px/1 var(--body);font-variant-numeric:tabular-nums lining-nums;color:var(--hud-text);letter-spacing:.01em}
.rbtn{position:relative;min-height:44px;padding:0 15px 0 12px;display:flex;align-items:center;justify-content:center;gap:7px;font:700 14px/1 var(--hud-font);letter-spacing:.1em;color:var(--hud-ink);background:linear-gradient(315deg,transparent 4.5px,var(--hud-cyan) 0);white-space:nowrap;flex:none}
.rbtn.ol{color:var(--hud-cyan);background:linear-gradient(315deg,var(--hud-cyan) 0 5px,transparent 0);box-shadow:inset 0 0 0 1px var(--hud-cyan-line)}

/* fly-in strip */
#flyBox{left:50%;top:calc(var(--st) + 70px);width:min(320px,calc(100% - 20px));transform:translateX(-50%)}
#flyBox .in{padding:5px 12px 6px 9px;display:grid;gap:4px}

/* sheet */
/* closed means hidden, not only off screen: rotating into the laptop layout can't slide it past, and Tab can't reach its buttons */
#sheet{position:absolute;left:0;right:0;bottom:0;top:calc(var(--st) + 112px);transform:translateY(103%);visibility:hidden;transition:transform .42s var(--ease),visibility 0s .42s;z-index:5;display:flex;flex-direction:column;--ct:18px}
#sheet.open{transform:none;visibility:visible;transition:transform .42s var(--ease),visibility 0s}
#sheet .in{display:flex;flex-direction:column;min-height:0;background:rgba(10,9,13,.965)}
.shead{display:flex;align-items:center;gap:9px;padding:calc(6px) 8px 6px 14px;border-bottom:1px solid var(--hud-red-line)}
.shead h2{margin:0;font:700 23px/1 var(--hud-font);letter-spacing:.06em;color:var(--hud-red);text-transform:uppercase}
.scroll{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:10px 12px calc(var(--sb) + 20px);flex:1;min-height:0;touch-action:pan-y}
.cards{display:grid;gap:10px}
#sheet:not(.g) .card[data-r]:not(.cur){display:none}
.stabs{display:flex;gap:2px;padding:0 8px;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--hud-hair)}
.stabs::-webkit-scrollbar{display:none}
#sheet.g .stabs{display:none}
.stabs button{flex:0 0 auto;min-height:40px;padding:0 12px;font:700 12px/1 var(--hud-font);letter-spacing:.1em;color:var(--hud-text3);box-shadow:inset 0 -2px 0 transparent}
.stabs button[aria-selected=true]{color:var(--hud-text);box-shadow:inset 0 -2px 0 var(--hud-red)}
.card{position:relative;background:var(--hud-s1);padding:10px 11px;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%);box-shadow:inset 0 0 0 1px var(--hud-hair)}
.card::before{content:'';position:absolute;left:0;top:0;width:28px;height:2px;background:var(--hud-red)}
.kick{display:flex;align-items:center;gap:6px;font:700 13px/1 var(--hud-font);letter-spacing:.1em;color:var(--hud-red);text-transform:uppercase;margin-bottom:7px}
.kick .mi{margin-left:auto}
.hero{display:grid;grid-template-columns:100px 1fr;gap:12px;align-items:center}
.hero .ring{width:96px;height:96px}
.hero .ring b{font-size:30px}
.hero .ring small{bottom:21px}
.big{font:700 44px/.95 var(--hud-font);color:var(--hud-text)}
.big small{font:600 16px/1 var(--hud-font);color:var(--hud-text3);letter-spacing:.05em}
.meta{font:13px/1.35 var(--body);color:var(--hud-text2)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.stat{background:var(--hud-s2);padding:7px 8px;clip-path:polygon(0 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%)}
.stat label{display:block;font:600 11px/1 var(--hud-font);letter-spacing:.08em;color:var(--hud-text3);text-transform:uppercase;margin-bottom:4px}
.stat b{font:700 21px/1 var(--hud-font);color:var(--hud-text)}
.sh{width:100%;text-align:left;display:grid;grid-template-columns:42px 62px 1fr 34px;gap:8px;align-items:center;min-height:32px;border-top:1px solid var(--hud-hair);font:14px/1 var(--body);color:var(--hud-text2)}
.sh:first-of-type{border-top:0}
.sh b{font:700 13px/1 var(--hud-font);letter-spacing:.08em;color:var(--hud-text)}
.sh.today b{background:var(--hud-yellow);color:var(--hud-ink);padding:3px 4px;text-align:center}
.sh .tr{height:7px;background:var(--hud-s3);position:relative}
.sh .tr i{position:absolute;top:0;bottom:0;background:var(--hud-red)}
.sh.off .tr{background:repeating-linear-gradient(-45deg,var(--hud-hair2) 0 1px,transparent 1px 4px)}
.sh em{font-style:normal;font-weight:700;font-variant-numeric:tabular-nums;color:var(--hud-text);text-align:right}
.acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}
.chk{display:grid;grid-template-columns:8px 1fr auto;gap:8px;align-items:center;font:13px/1.2 var(--body);color:var(--hud-text2);min-height:24px}
.chk i{width:8px;height:8px;background:var(--hud-green)}
.chk i.w{background:var(--hud-yellow)}
.chk .mi{color:var(--hud-text3);opacity:1}

#hint{position:absolute;left:50%;transform:translateX(-50%);font:600 12px/1 var(--hud-font);letter-spacing:.14em;color:var(--hud-text2);background:var(--hud-plate);padding:4px 9px;white-space:nowrap;transition:opacity .4s}
/* close up on her: the tags and the room's panel step aside */
#tags,#aptBox,#roomBox,#gymBox,#chBox,#scBox{transition:opacity .3s}
#hud.close #tags,#hud.close #aptBox,#hud.close #roomBox{opacity:0;pointer-events:none}
/* and her card comes in: who she is, her pose, her mood (his day) and their link (his progress) */
#herBox{left:calc(var(--sl) + 10px);right:calc(var(--sr) + 10px);bottom:calc(var(--sb) + 10px);opacity:0;pointer-events:none;transform:translateY(10px);transition:opacity .3s,transform .3s}
#hud.close #herBox{opacity:1;transform:none;transition:opacity .4s .35s,transform .4s .35s}
.hon{display:flex;align-items:center;gap:5px;margin-left:10px;font:600 11px/1 var(--hud-font);letter-spacing:.1em;color:var(--hud-green)}
.hon i{width:6px;height:6px;border-radius:50%;background:var(--hud-green);animation:hon 1.6s steps(2) infinite}
@keyframes hon{50%{opacity:.25}}
.hbody{padding:7px 9px 8px;display:grid;gap:5px}
.hrow{display:flex;align-items:center;gap:6px;min-width:0}
.hlike{white-space:normal;line-height:1.45}
@media (max-width:899px){#herBox .hlike{display:none}}
@media (prefers-reduced-motion:reduce){.hon i{animation:none}}

/* moments */
.dcol::before,.dcol::after{content:'';position:absolute;top:50%;height:1px;width:7px;background:var(--hud-red)}
.dcol::before{left:2px;box-shadow:0 -4px 0 -0px transparent}
.dcol::after{right:2px}
.dbox .in{position:relative}
.dbox .in::before{content:'';position:absolute;left:4px;top:4px;width:3px;height:3px;background:var(--hud-red)}
.conn{display:flex;align-items:center;gap:3px;flex:none}
.conn i{display:block;width:9px;height:1px;background:var(--hud-red)}
.conn b{display:block;width:5px;height:5px;box-shadow:0 0 0 1px var(--hud-red);background:transparent}
.cross{position:absolute;width:9px;height:9px;background:linear-gradient(var(--hud-red),var(--hud-red)) 50% 50%/100% 1px no-repeat,linear-gradient(var(--hud-red),var(--hud-red)) 50% 50%/1px 100% no-repeat;opacity:.8;pointer-events:none}
#roomData{display:none}
@media (hover:none){.tag .key{display:none}}
#hud.gl>*{animation:gl .36s steps(3) 1}
/* gl animates transform, which would override these: the closed sheet would flash open, the centred boxes would jump, and a box or scan line already playing would replay */
#hud.gl>#sheet,#hud.gl>#flyBox,#hud.gl>#hint{animation:none}
#hud.gl>.rvl{animation:rvl .55s var(--ease) both}
#hud.gl>.scanl.go{animation:scan 1s var(--ease) 1}
@keyframes gl{0%{transform:translateX(-5px);filter:hue-rotate(-14deg)}33%{transform:translateX(4px) skewX(-.6deg)}66%{transform:translateX(-2px)}100%{transform:none}}
#hud.city [data-m]:not([data-m~=city]),#hud.room [data-m]:not([data-m~=room]),#hud.fly [data-m]:not([data-m~=fly]){display:none!important}
#hud:not([data-room=shop]) [data-r=shop],#hud:not([data-room=apartment]) [data-r=apartment],#hud:not([data-room=gym]) [data-r=gym],#hud:not([data-room=chalet]) [data-r=chalet],#hud:not([data-room=castle]) [data-r=castle]{display:none!important}
.scanl{position:absolute;left:0;right:0;top:0;height:2px;background:var(--hud-red);box-shadow:0 0 14px var(--hud-red);opacity:0;pointer-events:none}
.scanl.go{animation:scan 1s var(--ease) 1}
@keyframes scan{0%{top:0;opacity:1}90%{opacity:1}100%{top:100%;opacity:0}}
.rvl{animation:rvl .55s var(--ease) both}
@keyframes rvl{0%{opacity:0;transform:scaleY(.04)}45%{opacity:1;transform:scaleY(.08)}100%{transform:none}}
.vgn{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 58%,transparent 62%,rgba(5,4,10,.42));pointer-events:none}

/* boot */
#boot{position:fixed;inset:0;z-index:20;background:#05040a;display:grid;place-items:center;transition:opacity .5s}
#boot .wrap{width:min(280px,76vw)}
#boot .bar{height:5px;background:var(--hud-red-soft);margin:8px 0 5px;position:relative}
#boot .bar i{position:absolute;left:0;top:0;bottom:0;width:0;background:var(--hud-red);transition:width .2s}
#boot b{font:700 21px/1 var(--hud-font);letter-spacing:.14em;color:var(--hud-text)}

@media (min-width:900px) and (min-aspect-ratio:1/1){
  .eqw{max-width:420px;margin-left:auto}
  #cityBox{right:auto;width:470px;left:calc(var(--sl) + 18px);bottom:18px}
  #dataBox{display:block;right:18px;bottom:18px;width:232px}
  #roomData{display:block;right:18px;bottom:18px;width:232px;transition:opacity .25s}
  #roomBox{right:auto;width:470px;left:18px;bottom:18px}
  #aptBox{right:auto;width:470px;left:18px;bottom:18px}
  #gymBox{right:auto;width:400px;left:18px;bottom:18px}
  #chBox{right:auto;width:400px;left:18px;bottom:18px}
  #scBox{right:auto;width:400px;left:18px;bottom:18px}
  #herBox{left:auto;right:18px;bottom:18px;width:300px}
  .aptl{max-height:min(176px,24vh)}
  .top{padding-left:18px;padding-right:18px}
  .ladder{display:block}
  #sheet{left:auto;width:min(560px,44vw);top:calc(var(--st) + 76px);transform:translateX(104%)}
  #sheet.open{transform:none}
  #perf{right:18px}
}
@media (max-width:899px){.clk{display:none}.eqw .row .mi:first-child{display:none}.eqw .row{justify-content:flex-end}}
@media (max-width:360px){.brand small{display:none}}
@media (prefers-reduced-motion:reduce){#hud.gl>*,#hud.gl>.rvl,#hud.gl>.scanl.go,.scanl.go,.rvl{animation:none}}
`;
const MARKUP = `
<canvas id="gl" aria-hidden="true"></canvas>
<div id="hud" class="city" data-room="shop">
  <div class="vgn"></div>
  <div class="top">
    <button class="frame brand" data-hud="prog" data-m="city fly" aria-label="Progress"><div class="in"><i></i><div><b>ARCADIA</b><small id="brandLv">LV 1</small></div></div></button>
    <button class="back" id="btnBack" data-m="room" aria-label="Back to the city"><span><svg viewBox="0 0 24 24"><path d="M15 4 7 12l8 8"/></svg></span></button>
    <button class="frame brand" data-hud="prog" data-m="room" data-r="shop" aria-label="Progress"><div class="in"><i></i><div><b>SHOP</b><small id="shopPer">PERIOD</small></div></div></button>
    <button class="frame brand" data-hud="prog" data-m="room" data-r="apartment" aria-label="Progress"><div class="in"><i></i><div><b>APARTMENT</b><small id="aptDate">TODAY</small></div></div></button>
    <button class="frame brand" data-hud="prog" data-m="room" data-r="gym" aria-label="Progress"><div class="in"><i></i><div><b>GYM</b><small id="gymDate">TODAY</small></div></div></button>
    <div class="frame eqw"><div class="in"><canvas id="eq" aria-hidden="true"></canvas><div class="row"><span class="mi">SIGNAL</span><span class="mi" id="eqv">SYNC OFF</span></div></div></div>
    <div class="frame clk"><div class="in"><b id="clk">00:00</b><span class="mi" id="clkd"></span></div></div>
    <button class="q" data-hud="add" aria-label="Quick add"><span style="font-size:22px;font-weight:400">+</span></button>
    <button class="q" data-hud="sys" aria-label="System settings"><span id="btnMe">J</span></button>
    <button class="q" id="btnQ" aria-pressed="false" aria-label="Show quality readout"><span>GFX</span></button>
  </div>
  <div id="perf" class="frame" hidden><div class="in"><h4>QUALITY</h4>FPS <b id="pF">-</b><br>DRAW CALLS <b id="pC">-</b><br>TRIANGLES <b id="pT">-</b><br>RENDER <b id="pR">-</b><br>SCALE <b id="pS">-</b><br>BLOOM/REFL <b id="pB">-</b></div></div>
  <svg id="leaders" data-m="city" aria-hidden="true"></svg>
  <div id="icons" data-m="city"></div>
  <svg class="ladder" data-m="city" style="left:calc(var(--sl) + 14px)" viewBox="0 0 46 210" id="ladL" aria-hidden="true"></svg>

  <section class="dbox frame rvl" id="cityBox" data-m="city" aria-label="District scan">
    <div class="in">
      <div class="dhead"><b>DISTRICT SCAN</b><div class="sq" id="sqA"></div></div><button class="dtog" id="dTog" type="button" aria-expanded="false" aria-label="Show district scan"></button>
      <div class="tickr"></div>
      <div class="dgrid">
        <div class="dcol"><i class="cross" style="left:3px;top:3px"></i><i class="cross" style="right:3px;bottom:3px"></i><div class="ring" id="ringA"></div></div>
        <div class="dcol2">
          <div style="display:flex;gap:6px;align-items:center;min-width:0"><div class="pl" id="dName">DOWNTOWN</div><div class="conn" aria-hidden="true"><i></i><b></b></div><canvas class="mini" id="wvA" style="flex:1;min-width:20px" aria-hidden="true"></canvas></div>
          <div class="rw"><span>NOW</span><div class="bar" id="bA"></div><em id="vA">0</em></div>
          <div class="rw"><span>LEVEL</span><div class="bar y" id="bB"></div><em id="vB">1</em></div>
          <div class="rw"><span>ALL SIX</span><div class="bar c" id="bC"></div><em id="vC">0</em></div>
        </div>
      </div>
      <div class="dfoot"><span class="mi" id="lvL">LV 1</span><div class="load"><i id="lA" style="width:0"></i></div><span class="mi" id="lAv">0/0 XP</span><div class="hatch"></div></div>
    </div>
  </section>
  <section class="dbox frame" id="dataBox" data-m="city" aria-label="Today">
    <div class="in">
      <div class="dhead"><b>TODAY</b><span class="nums" style="margin-left:auto"><span id="nA"></span><i></i><span id="nB"></span></span></div>
      <div class="tickr"></div>
      <div style="padding:7px 9px;display:grid;gap:5px">
        <div class="pl" style="align-self:auto">ISLAND NET</div>
        <div class="cells" id="cellsA" aria-hidden="true"></div>
        <div id="homeChk" style="display:grid;gap:5px"></div>
        <canvas id="wvB" aria-hidden="true" style="width:100%;height:30px;display:block"></canvas>
        <div class="rw"><span>XP</span><div class="bar" id="bD"></div><em id="vD">0</em></div>
        <div class="mi" style="line-height:1.5;white-space:normal">//CARS <span id="cCars">0</span> //DRAWS <span id="cWin">0</span><br>//FPS <span id="cT">0</span></div>
      </div>
    </div>
  </section>

  <section class="dbox frame" id="flyBox" data-m="fly" aria-live="off">
    <div class="in">
      <div style="display:flex;justify-content:space-between;align-items:center"><b id="flyT" style="font:700 14px/1 var(--hud-font);letter-spacing:.12em">APPROACH: SHOP</b><span class="mi" id="flyAlt">ALT 000M</span></div>
      <div class="load"><i id="flyP" style="width:0"></i></div>
      <div style="display:flex;justify-content:space-between"><span class="mi">VECTOR LOCK</span><span class="mi" id="flyD">DST 0000M</span></div>
    </div>
  </section>

  <div id="tags" data-m="room"></div>
  <section class="dbox frame" id="roomBox" data-m="room" data-r="shop" aria-label="Work status">
    <div class="in">
      <div class="dhead"><b id="rbT">OFF THE CLOCK</b><div class="sq" id="sqB"></div></div>
      <div class="tickr"></div>
      <div class="dgrid" style="grid-template-columns:82px 1fr">
        <div class="dcol" style="padding:5px"><div class="ring" id="ringB" style="width:66px;height:66px"></div></div>
        <div class="dcol2" style="justify-content:center">
          <div style="display:flex;align-items:center;gap:8px;justify-content:space-between"><div class="bigt" id="rbC">00:00:00</div><canvas class="mini" id="wvC" style="flex:1;min-width:30px" aria-hidden="true"></canvas><button class="rbtn" id="btnSheet">WORK</button></div>
          <div class="rw"><span>PERIOD</span><div class="bar y" id="bE"></div><em id="vE">0</em></div>
        </div>
      </div>
    </div>
  </section>
  <section class="dbox frame" id="roomData" data-m="room" data-r="shop" aria-label="Pay period">
    <div class="in">
      <div class="dhead"><b>PAY PERIOD</b><span class="nums" style="margin-left:auto"><span id="nC"></span><i></i><span id="nD"></span></span></div>
      <div class="tickr"></div>
      <div style="padding:7px 9px;display:grid;gap:5px">
        <div class="pl" style="align-self:auto">SHOP NET</div>
        <div class="cells" id="cellsB" aria-hidden="true"></div>
        <div id="roomChk" style="display:grid;gap:5px"></div>
        <canvas id="wvE" aria-hidden="true" style="width:100%;height:28px;display:block"></canvas>
        <div class="rw"><span>DAY</span><div class="bar" id="bG"></div><em id="vG">0</em></div>
      </div>
    </div>
  </section>
  <section class="dbox frame pe" id="aptBox" data-m="room" data-r="apartment" aria-label="Today's tasks">
    <div class="in">
      <div class="dhead"><b>TODAY</b><span class="mi" id="aptN"></span><button class="rbtn" id="btnAptSheet">PLAN</button></div>
      <div class="tickr"></div>
      <div class="aptl pe" id="aptList"></div>
    </div>
  </section>
  <section class="dbox frame" id="herBox" data-m="room" data-r="apartment" aria-label="Mira Kade" aria-hidden="true">
    <div class="in">
      <div class="dhead"><b>MIRA KADE</b><span class="hon"><i></i>ONLINE</span><div class="sq" id="sqH"></div></div>
      <div class="tickr"></div>
      <div class="hbody">
        <div class="mi">RESIDENT // FL 88 // AGE 27</div>
        <div class="hrow"><div class="pl" id="hPose">HELLO</div><div class="conn" aria-hidden="true"><i></i><b></b></div><span class="mi" id="hPoseN">POSE 01/05</span></div>
        <div class="rw"><span>MOOD</span><div class="bar" id="bH1"></div><em id="vH1">0</em></div>
        <div class="rw"><span>LINK</span><div class="bar c" id="bH2"></div><em id="vH2">0</em></div>
        <div class="mi hlike">LIKES // RAIN ON GLASS / LATE RAMEN / A FINISHED LIST</div>
      </div>
    </div>
  </section>
  <section class="dbox frame" id="gymBox" data-m="room" data-r="gym" aria-label="Today's session">
    <div class="in">
      <div class="dhead"><b>TODAY</b><span class="mi" id="gyN"></span><button class="rbtn" id="btnGymSheet">SESSION</button></div>
      <div class="tickr"></div>
      <div class="gyb">
        <div class="hrow"><div class="pl" id="gyS">D1</div><div class="conn" aria-hidden="true"><i></i><b></b></div><span class="mi" id="gyName"></span></div>
        <div class="rw"><span>SETS</span><div class="bar" id="bY1"></div><em id="vY1">0</em></div>
        <div class="gwk" id="gyWk" role="img" aria-label="This week"></div>
      </div>
    </div>
  </section>
  <section class="dbox frame" id="chBox" data-m="room" data-r="chalet" aria-label="Food and cardio today">
    <div class="in">
      <div class="dhead"><b>TODAY</b><span class="mi" id="chN"></span><button class="rbtn" id="btnChSheet">LIST</button></div>
      <div class="tickr"></div>
      <div class="gyb">
        <div class="rw"><span>SHAKES</span><div class="bar y" id="bK1"></div><em id="vK1">0/2</em></div>
        <div class="rw"><span>CART</span><div class="bar c" id="bK2"></div><em id="vK2">-</em></div>
        <div class="rw"><span>CARDIO</span><div class="bar" id="bK3"></div><em id="vK3">0</em></div>
      </div>
    </div>
  </section>
  <section class="dbox frame" id="scBox" data-m="room" data-r="castle" aria-label="School this week">
    <div class="in">
      <div class="dhead"><b>SCHOOL</b><span class="mi" id="scN"></span><button class="rbtn" id="btnScSheet">DUE</button></div>
      <div class="tickr"></div>
      <div class="gyb">
        <div class="rw"><span>STUDY</span><div class="bar c" id="bS1"></div><em id="vS1">0</em></div>
        <div class="rw"><span>DUE</span><div class="bar y" id="bS2"></div><em id="vS2">0</em></div>
        <div class="rw"><span>CLOCK</span><div class="bar" id="bS3"></div><em id="vS3">-</em></div>
      </div>
    </div>
  </section>
  <div id="hint" data-m="room" style="top:calc(var(--st) + 72px)">DRAG TO LOOK</div>

  <aside id="sheet" class="frame" aria-label="Work" aria-hidden="true">
    <div class="in">
      <div class="shead"><h2 id="shName">Work</h2><span class="mi" id="shPage" style="margin-left:auto">PAGE.01/03</span><button class="back" id="btnClose" aria-label="Close sheet"><span><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19"/></svg></span></button></div>
      <div class="stabs" id="shTabs" role="tablist" aria-label="Cards"></div>
      <div class="scroll" id="sheetScroll">
        <div class="cards">
          <section class="card" id="gAdd" data-g="add">
            <div class="kick">Quick add<span class="mi">SYS.INPUT/01</span></div>
            <form class="hadd" id="gAddF" style="margin-top:0"><input class="hin" id="gAddI" type="text" enterkeyhint="done" autocomplete="off" spellcheck="false" placeholder="A TASK, A SHIFT, SCHOOL WORK" aria-label="Quick add" aria-describedby="gAddP"><button class="rbtn" type="submit">ADD</button></form>
            <div class="qprev" id="gAddP" aria-live="polite"></div>
          </section>
          <section class="card" id="gProg" data-g="prog">
            <div class="kick">Progress<span class="mi" id="gpN"></span></div>
            <div id="gProgB"></div>
          </section>
          <section class="card" id="gSys" data-g="sys">
            <div class="kick">System<span class="mi" id="gsB"></span></div>
            <div id="gSysB"></div>
          </section>
          <section class="card" id="cCareer" data-r="apartment">
            <div class="kick">Career<span class="mi" id="crN">PAUSED</span></div>
            <div id="crRows"></div>
            <form class="jadd" id="crAdd"><input class="hin" name="company" type="text" autocomplete="off" placeholder="COMPANY" aria-label="Company"><input class="hin" name="role" type="text" autocomplete="off" placeholder="ROLE" aria-label="Role"><input class="hin" name="link" type="url" autocomplete="off" placeholder="LINK (OPTIONAL)" aria-label="Link to the posting"><button class="rbtn" type="submit">ADD</button></form>
          </section>
          <section class="card" id="cToday" data-r="apartment">
            <div class="kick">Today<span class="mi" id="tdN"></span></div>
            <div id="tdLate"></div>
            <div id="tdRows"></div>
            <form class="hadd" id="tdAdd" data-hadd=""><input class="hin" type="text" enterkeyhint="done" autocomplete="off" placeholder="ADD A TASK, E.G. CALL LEN 3PM" aria-label="Add a task for today"><button class="rbtn" type="submit">ADD</button></form>
          </section>
          <section class="card" id="cWeek" data-r="apartment">
            <div class="kick">This week<span class="mi" id="wkL"></span></div>
            <div id="wkNav"></div>
            <div id="wkRows"></div>
            <div id="wkDay" style="margin-top:8px"></div>
            <div id="wkAdd"></div>
            <div id="wkShift"></div>
          </section>
          <section class="card" id="cNotes" data-r="apartment">
            <div class="kick">Notes<span class="mi" id="ntN"></span></div>
            <form class="hadd nadd" data-nadd="1"><textarea class="hin" rows="2" placeholder="WRITE ONE" aria-label="Write a note"></textarea><button class="rbtn" type="submit">SAVE</button></form>
            <div id="ntRows"></div>
          </section>
          <section class="card" id="cDecide" data-r="apartment">
            <div class="kick">Needs a decision<span class="mi" id="dcN"></span></div>
            <div id="dcRows"></div>
          </section>
          <section class="card" id="cSess" data-r="gym">
            <div class="kick"><span id="ssK">Today's session</span><span class="mi" id="ssN"></span></div>
            <div class="ssh" id="ssHead"></div>
            <div id="ssRows"></div>
            <div class="acts" id="ssActs"></div>
            <div class="sgp gswap" id="ssSwap"></div>
          </section>
          <section class="card" id="cSplit" data-r="gym">
            <div class="kick">The split: this week<span class="mi" id="spN"></span></div>
            <div id="spRows"></div>
            <div class="acts"><span class="mi" id="spSt" style="align-self:center"></span></div>
            <div class="sed"><div class="sedh">EDIT THE SPLIT<em>REPEATS WEEKLY</em></div><div class="gtpl" id="spTpl"></div></div>
          </section>
          <section class="card" id="cBench" data-r="gym">
            <div class="kick">Benchmarks<span class="mi">THE RACK</span></div>
            <div id="bnRows"></div>
          </section>
          <section class="card" id="cRest" data-r="gym">
            <div class="kick">Rest timer<span class="mi">SYS.REST/01</span></div>
            <div class="rst" id="rsC" role="timer" aria-live="off">0:00</div>
            <div class="acts"><button class="rbtn" data-rest="60">60S</button><button class="rbtn" data-rest="90">90S</button><button class="rbtn" data-rest="120">2 MIN</button><button class="rbtn ol" data-act="rest-add">+30S</button><button class="rbtn ol" data-act="rest-skip">STOP</button></div>
          </section>
          <section class="card" id="cList" data-r="chalet">
            <div class="kick">The list<span class="mi" id="flN"></span></div>
            <div id="flRows"></div>
            <div class="acts" id="flActs"></div>
            <div class="sgp" id="flSnk"></div>
          </section>
          <section class="card" id="cMeals" data-r="chalet">
            <div class="kick"><span id="fmK">This week's meals</span><span class="mi" id="fmN"></span></div>
            <div id="fmBody"></div>
          </section>
          <section class="card" id="cShakes" data-r="chalet">
            <div class="kick">Shakes<span class="mi" id="fsN"></span></div>
            <div class="shk" id="fsBtns"></div>
            <div class="sgp" style="margin-top:10px"><b>THIS WEEK</b><div class="gwk" id="fsWk" role="img"></div></div>
          </section>
          <section class="card" id="cCardio" data-r="chalet">
            <div class="kick">Cardio<span class="mi" id="fcN"></span></div>
            <div class="rw"><span>WEEK</span><div class="bar" id="bK4"></div><em id="vK4">0</em></div>
            <div class="gwk" id="fcWk" role="img" style="margin-top:8px"></div>
            <div class="sgp" id="fcForm" style="margin-top:10px"></div>
            <div id="fcRows"></div>
          </section>
          <section class="card" id="cDue" data-r="castle">
            <div class="kick">What's due<span class="mi" id="cdN"></span></div>
            <div id="cdAdd"></div><div id="cdRows"></div>
          </section>
          <section class="card" id="cStudy" data-r="castle">
            <div class="kick">Study<span class="mi" id="cyN"></span></div>
            <div><div class="big tab" id="csClk" style="font-family:var(--body);font-size:38px;font-variant-numeric:tabular-nums">00:00:00</div><div class="meta" id="csClkS"></div><div class="acts"><button class="rbtn" id="btnStudy">START</button></div></div>
            <div id="csPick" style="margin-top:8px"></div>
            <div class="rw" style="margin:10px 0 8px"><span>WEEK</span><div class="bar c" id="bS4"></div><em id="vS4">0</em></div>
            <div id="csWk"></div>
            <div class="sed"><div id="csSess"></div><div id="csSadd"></div></div>
          </section>
          <section class="card" id="cBoard" data-r="castle">
            <div class="kick">This course<span class="mi" id="cbN"></span></div>
            <div id="cbBody"></div><div id="cbRes"></div><div id="cbResAdd"></div>
          </section>
          <section class="card" id="cShelf" data-r="castle">
            <div class="kick">Courses<span class="mi" id="ccN"></span></div>
            <div id="ccRows"></div><div id="ccAdd"></div><div id="ccSet"></div>
          </section>
          <section class="card" id="cClock" data-r="shop">
            <div class="kick">The clock<span class="mi">SYS.CLOCK/01</span></div>
            <div class="hero">
              <div class="ring" id="ringC"></div>
              <div><div class="big tab" id="shC" style="font-family:var(--body);font-size:38px;font-variant-numeric:tabular-nums">00:00:00</div><div class="meta" id="shS"></div>
              <div class="acts"><button class="rbtn" id="btnClock">CLOCK IN</button><button class="rbtn ol" id="btnBreak" data-act="clock-break" hidden>BREAK</button></div></div>
            </div>
          </section>
          <section class="card" id="cShifts" data-r="shop">
            <div class="kick"><span id="shK">Shifts: this period</span><span class="mi" id="shPer"></span></div>
            <div id="shNav"></div>
            <div class="stats" style="margin-bottom:8px"><div class="stat"><label>Hours</label><b id="stH">0</b></div><div class="stat"><label>Shifts</label><b id="stN">0</b></div><div class="stat"><label>Goal</label><b id="stG">-</b></div></div>
            <div id="shRows"></div>
            <div class="acts" id="shActs"></div>
            <div id="shEd"></div>
          </section>
          <section class="card" id="cPay" data-r="shop">
            <div class="kick">Pay<span class="mi" id="payWin"></span></div>
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px"><div class="big"><span id="payBig">$0</span><small id="payEst"> est.</small></div><canvas id="wvD" class="mini" style="width:96px;height:26px" aria-hidden="true"></canvas></div>
            <div class="rw" style="margin:8px 0 7px"><span>6 PAYS</span><div class="bar y" id="bF"></div><em id="payAll">$0</em></div>
            <div id="payChk"></div>
            <div class="acts"><button class="rbtn" id="btnLen" data-act="copy-submit">COPY FOR LEN</button><button class="rbtn ol" id="btnFill" data-act="fill-estimates" hidden>FILL THEM IN</button><button class="rbtn ol" data-wcopy="1">COPY PERIOD</button></div>
            <div class="sgp" style="margin-top:8px"><b>LAST 6 PERIODS</b><div class="ptr" id="payTr" role="img"></div></div>
          </section>
        </div>
      </div>
    </div>
  </aside>
  <div class="scanl" id="scan"></div>
</div>
<div id="boot"><div class="wrap"><b>ARCADIA</b><div class="bar"><i id="bootB"></i></div><span class="mi" id="bootT">INIT</span></div></div>
`;
const host = document.createElement('div'); host.id = 'cityHost'; host.hidden = true;
const ROOT = host.attachShadow({ mode: 'open' });
ROOT.innerHTML = '<style>' + CSS + '</style>' + MARKUP;
document.body.append(host);

/* ---------- small helpers ---------- */
const $ = (s, r = ROOT) => r.querySelector(s);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
const hex = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
function rng(seed) { let s = seed >>> 0; const f = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.range = (a, b) => a + (b - a) * f(); f.int = (a, b) => Math.floor(a + (b - a + 1) * f()); f.pick = a => a[Math.floor(f() * a.length)]; f.chance = p => f() < p; return f; }
const yieldFrame = () => new Promise(r => setTimeout(r, 0));

/* Test scripts only, see the rig at the bottom. */
const QS = new URLSearchParams(location.search);

/* ---------- material kinds written into every vertex ---------- */
const K = { PLAIN: 0, FACADE: 2, ROAD: 3, NEON: 4, SIGN: 5, AD: 6, GLASS: 7, SNOW: 8, BRASS: 9, MIRROR: 10, SCREEN: 11, CUT: 12, WALLTEX: 13, PAPER: 14, GROUND: 15 };
/* texture array layers */
const L = { WHITE: 0, WOOD: 1, WEAVE: 2, HERRING: 3, PARQUET: 4, MARBLE: 5, CONCRETE: 6, TILE: 7, GRIME: 8, CLOUD: 9, ASPHALT: 10, LEATHER: 11, COFFER: 12, BRICK: 13, WINA: 14, WINB: 15 };

/* ---------- merged geometry builder ---------- */
class MB {
  constructor(tris = 30000) {
    this.cap = tris * 3; this.n = 0;
    this.P = new Float32Array(this.cap * 3); this.N = new Int8Array(this.cap * 4);
    this.C = new Uint8Array(this.cap * 4); this.U = new Float32Array(this.cap * 2); this.M = new Uint8Array(this.cap * 4);
    this.c = [0.5, 0.5, 0.5]; this.a = 0; this.kind = 0; this.id = 1; this.em = 0; this.seed = 0; this.layer = 0;
    this.stack = []; this.m = null; this._id = 1;
  }
  grow() {
    this.cap *= 2; const g = (A, s) => { const n = new A.constructor(this.cap * s); n.set(A); return n; };
    this.P = g(this.P, 3); this.N = g(this.N, 4); this.C = g(this.C, 4); this.U = g(this.U, 2); this.M = g(this.M, 4);
  }
  nid() { this._id = (this._id + 37) % 229 + 1; return this._id; }
  /* transforms: push a matrix for everything built inside fn */
  at(x, y, z, ry, fn, rx = 0, rz = 0, s = 1) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(s, s, s));
    const prev = this.m; this.m = prev ? prev.clone().multiply(m) : m; this.me = this.m.elements; fn(this); this.m = prev; this.me = prev ? prev.elements : null;
  }
  vx(p, n, u, v, shade) {
    if (this.n >= this.cap) this.grow();
    const i = this.n++; let x = p[0], y = p[1], z = p[2], nx = n[0], ny = n[1], nz = n[2];
    if (this.me) { const e = this.me; const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14]; x = X; y = Y; z = Z; const NX = e[0] * nx + e[4] * ny + e[8] * nz, NY = e[1] * nx + e[5] * ny + e[9] * nz, NZ = e[2] * nx + e[6] * ny + e[10] * nz; const l = Math.hypot(NX, NY, NZ) || 1; nx = NX / l; ny = NY / l; nz = NZ / l; }
    this.P[i * 3] = x; this.P[i * 3 + 1] = y; this.P[i * 3 + 2] = z;
    this.N[i * 4] = nx * 127; this.N[i * 4 + 1] = ny * 127; this.N[i * 4 + 2] = nz * 127;
    const c = this.c, s = shade === undefined ? 1 : shade;
    this.C[i * 4] = clamp(c[0] * s) * 255; this.C[i * 4 + 1] = clamp(c[1] * s) * 255; this.C[i * 4 + 2] = clamp(c[2] * s) * 255; this.C[i * 4 + 3] = this.a;
    this.U[i * 2] = u; this.U[i * 2 + 1] = v;
    this.M[i * 4] = this.kind | (this.layer << 4); this.M[i * 4 + 1] = this.id; this.M[i * 4 + 2] = this.em; this.M[i * 4 + 3] = this.seed;
  }
  tri(a, b, c, ua = [0, 0], ub = [0, 0], uc = [0, 0], sa, sb, sc) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const n = [nx, ny, nz]; this.vx(a, n, ua[0], ua[1], sa); this.vx(b, n, ub[0], ub[1], sb); this.vx(c, n, uc[0], uc[1], sc);
  }
  quad(a, b, c, d, uv = [0, 0, 1, 1], sa, sb, sc, sd) {
    const [u0, v0, u1, v1] = uv;
    this.tri(a, b, c, [u0, v0], [u1, v0], [u1, v1], sa, sb, sc); this.tri(a, c, d, [u0, v0], [u1, v1], [u0, v1], sa, sc, sd);
  }
  set(o = {}) {
    if (o.c !== undefined) this.c = typeof o.c === 'number' ? hex(o.c) : o.c;
    if (o.kind !== undefined) this.kind = o.kind; if (o.layer !== undefined) this.layer = o.layer;
    if (o.id !== undefined) this.id = o.id; if (o.em !== undefined) this.em = o.em; if (o.seed !== undefined) this.seed = o.seed; if (o.a !== undefined) this.a = o.a;
    return this;
  }
  /* wall strip from a polygon ring (order: south side going east, then east side going north ...) */
  extrude(poly, y0, y1, o = {}) {
    if (o.c !== undefined) this.c = typeof o.c === 'number' ? hex(o.c) : o.c;
    const base = o.id || this.nid(), crease = o.crease !== false; let per = o.u0 || 0; const n = poly.length; const sh = o.grad === undefined ? 0.72 : o.grad; const us = o.uvS || 1;
    const idSave = this.id;
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      this.id = crease ? (base + i * 3) % 229 + 1 : base;
      this.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], [per * us, y0 * us, (per + len) * us, y1 * us], sh, sh, 1, 1);
      per += len;
    }
    this.id = idSave;
    if (o.top !== false) {
      const k = this.kind, L0 = this.layer, c0 = this.c, a0 = this.a; if (o.topc !== undefined) this.c = typeof o.topc === 'number' ? hex(o.topc) : o.topc;
      this.kind = o.topKind === undefined ? (k === K.FACADE ? K.PLAIN : k) : o.topKind; if (o.topLayer !== undefined) this.layer = o.topLayer;
      this.id = (base + 113) % 229 + 1;
      const p0 = poly[0];
      for (let i = 1; i < n - 1; i++) { const p = poly[i], q = poly[i + 1]; this.tri([p0[0], y1, p0[1]], [p[0], y1, p[1]], [q[0], y1, q[1]], [p0[0] * us, p0[1] * us], [p[0] * us, p[1] * us], [q[0] * us, q[1] * us]); }
      this.kind = k; this.layer = L0; this.c = c0; this.a = a0; this.id = idSave;
    }
    if (o.bot) { const idS = this.id; this.id = (base + 71) % 229 + 1; const p0 = poly[0]; for (let i = 1; i < n - 1; i++) { const p = poly[i], q = poly[i + 1]; this.tri([p0[0], y0, p0[1]], [q[0], y0, q[1]], [p[0], y0, p[1]], [p0[0], p0[1]], [q[0], q[1]], [p[0], p[1]]); } this.id = idS; }
  }
  /* axis aligned box, x and z centred, y is the base */
  box(x, y, z, w, h, d, o = {}) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    this.extrude([[x0, z1], [x1, z1], [x1, z0], [x0, z0]], y, y + h, { bot: o.bot !== false, ...o });
  }
  /* rotated box with the same args */
  rbox(x, y, z, w, h, d, ry, o = {}) { this.at(x, y, z, ry, () => this.box(0, 0, 0, w, h, d, o)); }
  /* box between two points with a square section */
  beam(a, b, t, o = {}) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
    const ry = Math.atan2(dx, dz), rx = Math.atan2(Math.hypot(dx, dz), dy);
    this.at(a[0], a[1], a[2], ry, () => this.box(0, 0, 0, o.tz || t, len, t, o), rx);
  }
  cyl(x, y, z, r0, r1, h, seg = 8, o = {}) {
    if (o.c !== undefined) this.c = typeof o.c === 'number' ? hex(o.c) : o.c;
    const base = o.id || this.nid(), idS = this.id; this.id = base; const slope = (r0 - r1) / (h || 1);
    for (let i = 0; i < seg; i++) {
      const a = i / seg * TAU, b = (i + 1) / seg * TAU, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      const A = [x + ca * r0, y, z + sa * r0], B = [x + cb * r0, y, z + sb * r0], C = [x + cb * r1, y + h, z + sb * r1], D = [x + ca * r1, y + h, z + sa * r1];
      const na = [ca, slope, sa], nb = [cb, slope, sb], g = o.grad === undefined ? 0.8 : o.grad;
      const u0 = i / seg * TAU * Math.max(r0, r1), u1 = (i + 1) / seg * TAU * Math.max(r0, r1);
      this.vx(A, na, u0, 0, g); this.vx(C, nb, u1, h, 1); this.vx(B, nb, u1, 0, g); this.vx(A, na, u0, 0, g); this.vx(D, na, u0, h, 1); this.vx(C, nb, u1, h, 1);
    }
    if (o.top !== false && r1 > 0.0001) { this.id = (base + 91) % 229 + 1; const tc = o.topc !== undefined ? hex(o.topc) : null, c0 = this.c; if (tc) this.c = tc; for (let i = 0; i < seg; i++) { const a = i / seg * TAU, b = (i + 1) / seg * TAU; this.tri([x, y + h, z], [x + Math.cos(b) * r1, y + h, z + Math.sin(b) * r1], [x + Math.cos(a) * r1, y + h, z + Math.sin(a) * r1]); } this.c = c0; }
    if (o.bot && r0 > 0.0001) { this.id = (base + 47) % 229 + 1; for (let i = 0; i < seg; i++) { const a = i / seg * TAU, b = (i + 1) / seg * TAU; this.tri([x, y, z], [x + Math.cos(a) * r0, y, z + Math.sin(a) * r0], [x + Math.cos(b) * r0, y, z + Math.sin(b) * r0]); } }
    this.id = idS;
  }
  /* profile: [[radius, y], ...] bottom to top */
  lathe(x, y, z, prof, seg = 8, o = {}) {
    if (o.c !== undefined) this.c = typeof o.c === 'number' ? hex(o.c) : o.c;
    const idS = this.id; this.id = o.id || this.nid(); const sq = o.sq || 1; /* squash z */
    for (let j = 0; j < prof.length - 1; j++) {
      const [r0, y0] = prof[j], [r1, y1] = prof[j + 1]; const ny = (r0 - r1) / (Math.hypot(r0 - r1, y1 - y0) || 1), nl = Math.sqrt(Math.max(0, 1 - ny * ny));
      for (let i = 0; i < seg; i++) {
        const a = i / seg * TAU, b = (i + 1) / seg * TAU, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
        const A = [x + ca * r0, y + y0, z + sa * r0 * sq], B = [x + cb * r0, y + y0, z + sb * r0 * sq], C = [x + cb * r1, y + y1, z + sb * r1 * sq], D = [x + ca * r1, y + y1, z + sa * r1 * sq];
        const na = [ca * nl, ny, sa * nl], nb = [cb * nl, ny, sb * nl], s = lerp(o.grad === undefined ? .78 : o.grad, 1, y0 / (prof[prof.length - 1][1] || 1)), s1 = lerp(o.grad === undefined ? .78 : o.grad, 1, y1 / (prof[prof.length - 1][1] || 1));
        if (r0 > 1e-4) { this.vx(A, na, i / seg, y0, s); this.vx(C, nb, (i + 1) / seg, y1, s1); this.vx(B, nb, (i + 1) / seg, y0, s); }
        if (r1 > 1e-4) { this.vx(A, na, i / seg, y0, s); this.vx(D, na, i / seg, y1, s1); this.vx(C, nb, (i + 1) / seg, y1, s1); }
      }
    }
    this.id = idS;
  }
  /* tube along a smooth path */
  tube(pts, r, seg = 12, rad = 4, o = {}) {
    if (o.c !== undefined) this.c = typeof o.c === 'number' ? hex(o.c) : o.c;
    const idS = this.id; this.id = o.id || this.nid();
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), !!o.closed, 'catmullrom', o.tension === undefined ? .5 : o.tension);
    const P = curve.getSpacedPoints ? curve.getPoints(seg) : []; const up = new THREE.Vector3(0, 1, 0); let prevN = null; const rings = [];
    for (let i = 0; i <= seg; i++) {
      const p = P[i], t = (i < seg ? P[i + 1].clone().sub(p) : p.clone().sub(P[i - 1])).normalize();
      let n = prevN ? prevN.clone().sub(t.clone().multiplyScalar(prevN.dot(t))).normalize() : (Math.abs(t.y) > .9 ? new THREE.Vector3(1, 0, 0) : up.clone().sub(t.clone().multiplyScalar(up.dot(t))).normalize());
      prevN = n; const bn = t.clone().cross(n).normalize(); const ring = [], R = typeof r === 'function' ? r(i / seg) : r;
      for (let k = 0; k < rad; k++) { const a = k / rad * TAU, ca = Math.cos(a), sa = Math.sin(a); const N = [n.x * ca + bn.x * sa, n.y * ca + bn.y * sa, n.z * ca + bn.z * sa]; ring.push({ p: [p.x + N[0] * R, p.y + N[1] * R, p.z + N[2] * R], n: N }); }
      rings.push(ring);
    }
    for (let i = 0; i < seg; i++) for (let k = 0; k < rad; k++) {
      const a = rings[i][k], b = rings[i][(k + 1) % rad], c = rings[i + 1][(k + 1) % rad], d = rings[i + 1][k];
      this.vx(a.p, a.n, k / rad, i / seg); this.vx(b.p, b.n, (k + 1) / rad, i / seg); this.vx(c.p, c.n, (k + 1) / rad, (i + 1) / seg);
      this.vx(a.p, a.n, k / rad, i / seg); this.vx(c.p, c.n, (k + 1) / rad, (i + 1) / seg); this.vx(d.p, d.n, k / rad, (i + 1) / seg);
    }
    this.id = idS;
  }
  /* lumpy blob (bags, foliage, rocks) */
  blob(x, y, z, r, o = {}) {
    if (o.c !== undefined) this.c = typeof o.c === 'number' ? hex(o.c) : o.c;
    const R = o.r || rng(Math.floor(x * 97 + z * 131 + y * 17)); const idS = this.id; this.id = o.id || this.nid(); const sy = o.sy || .85;
    const t = (1 + Math.sqrt(5)) / 2; const V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    const F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const J = V.map(() => 1 + (R() - .5) * (o.j === undefined ? .35 : o.j));
    const pt = i => { const v = V[i], l = Math.hypot(v[0], v[1], v[2]) / J[i]; return [x + v[0] / l * r, y + v[1] / l * r * sy, z + v[2] / l * r]; };
    for (const f of F) { const a = pt(f[0]), b = pt(f[1]), c = pt(f[2]); const s = yy => lerp(.7, 1, clamp((yy - y + r * sy) / (2 * r * sy))); this.tri(a, b, c, [a[0], a[2]], [b[0], b[2]], [c[0], c[2]], s(a[1]), s(b[1]), s(c[1])); }
    this.id = idS;
  }
  /* closed ring loft, rings are arrays of same-length points */
  loft(rings, o = {}) {
    if (o.c !== undefined) this.c = typeof o.c === 'number' ? hex(o.c) : o.c;
    const idS = this.id; this.id = o.id || this.nid(); const us = o.uvS || 1; const flip = !!o.flip;
    if (o.smooth) {
      /* one normal per vertex, averaged from its neighbours around and along, so round things stay round */
      const nr = rings.length, nn = rings[0].length, sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], N = (j, i) => { const a = rings[j][(i + 1) % nn], b = rings[j][(i - 1 + nn) % nn], c = rings[Math.min(j + 1, nr - 1)][i], d = rings[Math.max(j - 1, 0)][i], u = sub(a, b), v = sub(c, d); let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const l = Math.hypot(...n) || 1, sg = flip ? -1 : 1; return [n[0] / l * sg, n[1] / l * sg, n[2] / l * sg]; };
      for (let j = 0; j < nr - 1; j++) { const A = rings[j], B = rings[j + 1], s0 = lerp(o.grad || .8, 1, j / (nr - 1)), s1 = lerp(o.grad || .8, 1, (j + 1) / (nr - 1)); for (let i = 0; i < nn; i++) { const i1 = (i + 1) % nn, a = A[i], b = A[i1], c = B[i1], d = B[i], na = N(j, i), nb = N(j, i1), nc = N(j + 1, i1), nd = N(j + 1, i), u0 = i * .1 * us, u1 = (i + 1) * .1 * us, v0 = j * .15 * us, v1 = (j + 1) * .15 * us; if (flip) { this.vx(a, na, u0, v0, s0); this.vx(c, nc, u1, v1, s1); this.vx(b, nb, u1, v0, s0); this.vx(a, na, u0, v0, s0); this.vx(d, nd, u0, v1, s1); this.vx(c, nc, u1, v1, s1); } else { this.vx(a, na, u0, v0, s0); this.vx(b, nb, u1, v0, s0); this.vx(c, nc, u1, v1, s1); this.vx(a, na, u0, v0, s0); this.vx(c, nc, u1, v1, s1); this.vx(d, nd, u0, v1, s1); } } }
      this.id = idS; return;
    }
    for (let j = 0; j < rings.length - 1; j++) { const A = rings[j], B = rings[j + 1], n = A.length, s0 = lerp(o.grad || .8, 1, j / (rings.length - 1)), s1 = lerp(o.grad || .8, 1, (j + 1) / (rings.length - 1)); for (let i = 0; i < n; i++) { const a = A[i], b = A[(i + 1) % n], c = B[(i + 1) % n], d = B[i]; const u0 = i * .1 * us, u1 = (i + 1) * .1 * us, v0 = j * .15 * us, v1 = (j + 1) * .15 * us; const fk = o.fold && (i % o.fold === 0) ? .74 : 1, sa = s0 * fk, sb = s1 * fk; if (flip) { this.tri(a, c, b, [u0, v0], [u1, v1], [u1, v0], sa, sb, sa); this.tri(a, d, c, [u0, v0], [u0, v1], [u1, v1], sa, sb, sb); } else { this.tri(a, b, c, [u0, v0], [u1, v0], [u1, v1], sa, sa, sb); this.tri(a, c, d, [u0, v0], [u1, v1], [u0, v1], sa, sb, sb); } } }
    this.id = idS;
  }
  /* atlas quad: origin centre, w/h, faces along yaw (0 faces +z) */
  plate(x, y, z, w, h, ry, cell, o = {}) {
    const kind0 = this.kind, em0 = this.em, id0 = this.id, c0 = this.c;
    this.kind = o.kind === undefined ? K.SIGN : o.kind; this.em = o.em === undefined ? 255 : o.em; this.id = o.id || this.nid(); this.c = o.c ? (typeof o.c === 'number' ? hex(o.c) : o.c) : [1, 1, 1]; const seed0 = this.seed; if (o.seed !== undefined) this.seed = o.seed;
    const sx = o.flip ? -1 : 1;
    this.at(x, y, z, ry, () => { this.quad([-w / 2, -h / 2, 0], [w / 2, -h / 2, 0], [w / 2, h / 2, 0], [-w / 2, h / 2, 0], sx > 0 ? [cell[0], cell[1], cell[2], cell[3]] : [cell[2], cell[1], cell[0], cell[3]]); });
    this.kind = kind0; this.em = em0; this.id = id0; this.c = c0; this.seed = seed0;
  }
  geom() {
    const g = new THREE.BufferGeometry(), n = this.n;
    g.setAttribute('position', new THREE.BufferAttribute(this.P.slice(0, n * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(this.N.slice(0, n * 4), 4, true));
    g.setAttribute('aCol', new THREE.BufferAttribute(this.C.slice(0, n * 4), 4, true));
    g.setAttribute('aUv', new THREE.BufferAttribute(this.U.slice(0, n * 2), 2));
    g.setAttribute('aMat', new THREE.BufferAttribute(this.M.slice(0, n * 4), 4));
    g.computeBoundingSphere(); return g;
  }
}

/* polygons */
const rectPoly = (x, z, w, d) => [[x - w / 2, z + d / 2], [x + w / 2, z + d / 2], [x + w / 2, z - d / 2], [x - w / 2, z - d / 2]];
function chamferPoly(x, z, w, d, c) { const a = w / 2, b = d / 2; c = Math.min(c, a * .9, b * .9); return [[x - a + c, z + b], [x + a - c, z + b], [x + a, z + b - c], [x + a, z - b + c], [x + a - c, z - b], [x - a + c, z - b], [x - a, z - b + c], [x - a, z + b - c]]; }
function roundPoly(x, z, w, d, r, seg = 3) { const a = w / 2, b = d / 2; r = Math.min(r, a, b); const P = []; const cs = [[x + a - r, z + b - r, 90], [x + a - r, z - b + r, 0], [x - a + r, z - b + r, -90], [x - a + r, z + b - r, -180]]; for (const [cx, cz, st] of cs) for (let i = 0; i <= seg; i++) { const t = (st - i / seg * 90) * Math.PI / 180; P.push([cx + Math.cos(t) * r, cz + Math.sin(t) * r]); } return P; }

/* the shared glow list: additive billboards */
const GLOW = [];
function glow(x, y, z, c, size, anim = 0) { const k = typeof c === 'number' ? hex(c) : c; GLOW.push({ x, y, z, r: k[0], g: k[1], b: k[2], s: size, a: anim }); }

/* palette tokens used by the world */
const PAL = {
  ink: 0x07070b, yellow: 0xf6ee1c, magenta: 0xff2a3c, pink: 0xff2e88, cyan: 0x16e4f4, red: 0xff2a2a, green: 0x8cff5a, orange: 0xff9a3c, warm: 0xffc47a, cool: 0xcfe6ff, violet: 0x2a1f4f,
  concrete: 0x75717f, concreteD: 0x4a5260, pink: 0xc0568a, kyellow: 0xc9a23a, mint: 0x4f9f92, glass: 0x1b2036, slate: 0x2a3044, trim: 0x3e4664, walnut: 0x5a3a26, brass: 0xc9a050, marble: 0xcfc4b2, leather: 0x24443a, stone: 0x6a6578, roofD: 0x2e3040, copper: 0x41685c, garden: 0x22402f,
};

/* ---------- hand-painted greyscale tiles, stored as one R8 texture array ---------- */
function paintTiles(S = 512) {
  const names = Object.keys(L), N = names.length, data = new Uint8Array(S * S * N);
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d', { willReadFrequently: true });
  const R = rng(4242);
  const wrap = fn => { for (const dx of [0, -S]) for (const dy of [0, -S]) { x.save(); x.translate(dx, dy); fn(); x.restore(); } };
  const g = v => { const k = Math.round(v * 255); return `rgb(${k},${k},${k})`; };
  const fill = v => { x.fillStyle = g(v); x.fillRect(0, 0, S, S); };
  const paints = {
    WHITE() { fill(1); },
    WOOD() {
      fill(.82);
      for (let i = 0; i < 60; i++) { const y = R() * S, a = R.range(2, 16), f = R.range(.6, 2.4) * TAU / S, ph = R() * TAU, w = R.range(1, 7), v = R.chance(.75) ? R.range(.55, .74) : R.range(.9, 1); const seq = []; for (let px = 0; px <= S; px += 16) seq.push([px, y + Math.sin(px * Math.round(f * S / TAU) * TAU / S + ph) * a]); wrap(() => { x.strokeStyle = g(v); x.lineWidth = w; x.beginPath(); seq.forEach((p, j) => j ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke(); }); }
      for (let k = 0; k < 3; k++) { const cx = R() * S, cy = R() * S; wrap(() => { for (let r = 22; r > 4; r -= 5) { x.strokeStyle = g(r % 2 ? .5 : .66); x.lineWidth = 2; x.beginPath(); x.ellipse(cx, cy, r * 2.2, r * .8, 0, 0, TAU); x.stroke(); } }); }
    },
    WEAVE() { fill(.88); for (let py = 0; py < S; py += 4) for (let px = 0; px < S; px += 4) { const on = ((px + py) / 4) % 2 < 1; x.fillStyle = g(on ? .96 : .78 + R() * .06); x.fillRect(px, py, 4, 4); } },
    HERRING() { fill(.82); const w = 16; for (let px = 0; px < S; px += w) for (let py = 0; py < S; py += 6) { const up = Math.floor(px / w) % 2; x.fillStyle = g((py / 6 + (up ? px / w : 0)) % 2 < 1 ? 1 : .66); x.save(); x.translate(px, py); x.transform(1, up ? .36 : -.36, 0, 1, 0, 0); x.fillRect(0, 0, w, 3); x.restore(); } },
    PARQUET() {
      fill(.34); const n = 24, u = S / n, plank = (i, j) => { const k = (((i + j) % 8) + 8) % 8; return k < 4 ? { h: 1, id: (i - k) * 31 + j * 7 } : { h: 0, id: i * 17 + (j - (k - 4)) * 43 }; };
      const sh = id => { const q = Math.abs(Math.sin(id * 12.9898) * 43758.5453) % 1; return .74 + q * .2; };
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const P = plank(i, j), v = sh(P.id), X = Math.round(i * u), Y = Math.round(j * u), W = Math.round((i + 1) * u) - X, H = Math.round((j + 1) * u) - Y;
        x.fillStyle = g(v); x.fillRect(X, Y, W, H);
        x.strokeStyle = g(v * .88); x.lineWidth = 1; for (let k = 0; k < 2; k++) { x.beginPath(); if (P.h) { const yy = Y + (k + .5) * H / 2 + (R() - .5) * 2; x.moveTo(X, yy); x.lineTo(X + W, yy + (R() - .5)); } else { const xx = X + (k + .5) * W / 2 + (R() - .5) * 2; x.moveTo(xx, Y); x.lineTo(xx + (R() - .5), Y + H); } x.stroke(); }
        /* seams only where the plank changes */
        const nb = (a, b) => { const Q = plank(a, b); return Q.h !== P.h || Q.id !== P.id; };
        x.fillStyle = g(.42); if (nb(i + 1, j)) x.fillRect(X + W - 1, Y, 1, H); if (nb(i, j + 1)) x.fillRect(X, Y + H - 1, W, 1);
      }
    },
    MARBLE() { fill(.94); for (let i = 0; i < 10; i++) { const cx = R() * S, cy = R() * S, r = R.range(40, 150); wrap(() => { x.fillStyle = g(R.range(.86, .9)); x.beginPath(); x.ellipse(cx, cy, r * 1.8, r * .5, .5, 0, TAU); x.fill(); }); } for (let i = 0; i < 12; i++) { const px = R() * S, py = R() * S, v = R.range(.66, .84), w = R.range(.6, 1.8), ph = R() * 9; const seq = []; let qx = px, qy = py; for (let j = 0; j < 22; j++) { seq.push([qx, qy]); qx += 24; qy += 9 + Math.sin(j * .8 + ph) * 10; } wrap(() => { x.strokeStyle = g(v); x.lineWidth = w; x.lineJoin = 'round'; x.beginPath(); seq.forEach((p, j) => j ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke(); }); } },
    CONCRETE() {
      fill(.84);
      for (let i = 0; i < 90; i++) { const cx = R() * S, cy = R() * S, r = R.range(8, 70), v = R.chance(.7) ? R.range(.66, .78) : R.range(.9, 1); wrap(() => { x.fillStyle = g(v); x.beginPath(); for (let a = 0; a < TAU; a += .7) { const rr = r * (.7 + .5 * Math.abs(Math.sin(a * 3 + i))); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .7); } x.fill(); }); }
      for (let i = 0; i < 26; i++) { const cx = R() * S, cy = R() * S, h = R.range(30, 170), w = R.range(2, 10); wrap(() => { x.fillStyle = g(.6); x.fillRect(cx, cy, w, h); }); }
      x.strokeStyle = g(.5); x.lineWidth = 1.5; for (let i = 0; i < 12; i++) { x.beginPath(); let qx = R() * S, qy = R() * S; x.moveTo(qx, qy); for (let j = 0; j < 7; j++) { qx += R.range(-22, 22); qy += R.range(6, 26); x.lineTo(qx, qy); } x.stroke(); }
    },
    TILE() {
      fill(.82); const t = S / 8;
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const cx = (i + (j % 2 ? .5 : 0)) * t, cy = (j + .5) * t; wrap(() => { x.fillStyle = g(.68); x.beginPath(); x.moveTo(cx, cy - t * .36); x.quadraticCurveTo(cx + t * .22, cy - t * .08, cx + t * .14, cy + t * .1); x.quadraticCurveTo(cx + t * .05, cy + t * .3, cx, cy + t * .4); x.quadraticCurveTo(cx - t * .05, cy + t * .3, cx - t * .14, cy + t * .1); x.quadraticCurveTo(cx - t * .22, cy - t * .08, cx, cy - t * .36); x.fill(); x.fillStyle = g(.9); x.beginPath(); x.ellipse(cx, cy, t * .05, t * .12, 0, 0, TAU); x.fill(); }); }
      x.strokeStyle = g(.66); x.lineWidth = 1; for (let i = 0; i < 16; i++) { x.beginPath(); x.moveTo(i * S / 16 + S / 32, 0); x.lineTo(i * S / 16 + S / 32, S); x.stroke(); }
      for (let i = 0; i < 26; i++) { const cx = R() * S, cy = R() * S, w = R.range(4, 20), h = R.range(40, 200), v = R.range(.72, .88); wrap(() => { x.globalAlpha = .55; x.fillStyle = g(v); x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + w, cy); x.lineTo(cx + w * .5, cy + h); x.closePath(); x.fill(); x.globalAlpha = 1; }); }
    },
    GRIME() {
      fill(1);
      for (let i = 0; i < 70; i++) { const cx = R() * S, cy = R() * S, w = R.range(3, 34), h = R.range(40, 280), v = R.range(.6, .86); wrap(() => { x.fillStyle = g(v); x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + w, cy); x.lineTo(cx + w * .6, cy + h); x.lineTo(cx + w * .3, cy + h * .8); x.closePath(); x.fill(); }); }
      for (let i = 0; i < 26; i++) { const cx = R() * S, cy = R() * S, r = R.range(14, 60); wrap(() => { x.fillStyle = g(R.range(.68, .9)); x.beginPath(); x.ellipse(cx, cy, r * 1.4, r, R() * 3, 0, TAU); x.fill(); }); }
    },
    CLOUD() {
      fill(.5);
      for (let oct = 0; oct < 4; oct++) { const n = 18 << oct, r0 = 120 >> oct; x.globalAlpha = .55 / (oct + 1); for (let i = 0; i < n; i++) { const cx = R() * S, cy = R() * S, r = r0 * R.range(.5, 1.3), v = R() > .5 ? 1 : 0; wrap(() => { const G = x.createRadialGradient(cx, cy, 0, cx, cy, r); G.addColorStop(0, v ? 'rgba(255,255,255,.9)' : 'rgba(0,0,0,.9)'); G.addColorStop(1, v ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)'); x.fillStyle = G; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }); } } x.globalAlpha = 1;
    },
    ASPHALT() {
      fill(.78);
      for (let i = 0; i < 2600; i++) { x.fillStyle = g(R.chance(.5) ? R.range(.62, .72) : R.range(.86, .95)); x.fillRect(R() * S, R() * S, R.range(1, 3), R.range(1, 3)); }
      for (let i = 0; i < 18; i++) { const cx = R() * S, cy = R() * S, r = R.range(16, 70); wrap(() => { x.fillStyle = g(R.range(.58, .68)); x.beginPath(); x.ellipse(cx, cy, r * 1.6, r * .7, R() * 3, 0, TAU); x.fill(); }); }
      x.strokeStyle = g(.5); x.lineWidth = 1.4; for (let i = 0; i < 10; i++) { x.beginPath(); let qx = R() * S, qy = R() * S; x.moveTo(qx, qy); for (let j = 0; j < 7; j++) { qx += R.range(-30, 30); qy += R.range(-30, 30); x.lineTo(qx, qy); } x.stroke(); }
    },
    LEATHER() { fill(.88); for (let i = 0; i < 5200; i++) { x.fillStyle = g(R.chance(.5) ? R.range(.74, .84) : R.range(.92, 1)); x.fillRect(R() * S, R() * S, R.range(1, 3), R.range(1, 2)); } },
    COFFER() { fill(.9); x.strokeStyle = g(.62); x.lineWidth = 6; x.strokeRect(36, 36, S - 72, S - 72); x.strokeStyle = g(1); x.lineWidth = 2; x.strokeRect(46, 46, S - 92, S - 92); for (let i = 0; i < 18; i++) { x.fillStyle = g(R.range(.76, .86)); x.fillRect(60 + R() * (S - 180), 60 + R() * (S - 180), R.range(20, 70), R.range(6, 40)); } },
    BRICK() { fill(.38); const bw = 64, bh = 28; for (let j = 0; j < 19; j++) for (let i = -1; i < 9; i++) { x.fillStyle = g(R.range(.68, 1)); x.fillRect(i * bw + (j % 2 ? bw / 2 : 0) + 2, j * bh + 2, bw - 4, bh - 4); } },
  };
  const winMap = (rate) => { fill(0); const n = 32, c = S / n; for (let j = 0; j < n; j++) { const fl = R.chance(.16) ? .25 : 1; for (let i = 0; i < n; i++) { const blk = (Math.abs(Math.sin(Math.floor(i / 5) * 3.1 + Math.floor(j / 3) * 7.7) * 91.7) % 1) * 1.7 + .15; if (R() < rate * fl * blk) { x.fillStyle = g(R.range(.55, 1)); x.fillRect(i * c + c * .2, j * c + c * .24, Math.max(1, c * .6), Math.max(1, c * .52)); } } } };
  paints.WINA = () => winMap(.2); paints.WINB = () => winMap(.46);
  names.forEach((nm, li) => {
    x.globalAlpha = 1; paints[nm](); const id = x.getImageData(0, 0, S, S).data; const off = li * S * S;
    for (let i = 0; i < S * S; i++) data[off + i] = id[i * 4];
  });
  const t = new THREE.DataArrayTexture(data, S, S, N);
  t.format = THREE.RedFormat; t.type = THREE.UnsignedByteType; t.internalFormat = 'R8';
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}

/* ---------- sign atlas: words on plates, posters, room paper ---------- */
const CELL = {};
/* system fonts only: the app loads no sign fonts */
const FONT_JP = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","Meiryo","Noto Sans JP",sans-serif';
const FONT_EN = '"Avenir Next Condensed","DIN Condensed","Bahnschrift SemiCondensed","Arial Narrow",sans-serif';
const FONT_DISP = '"Avenir Next","Arial Black",Impact,sans-serif';
const FONT_MONO = 'Menlo,Consolas,monospace';

function drawSigns() {
  const S = 2048, SH = 3072, cv = document.createElement('canvas'); cv.width = S; cv.height = SH; const x = cv.getContext('2d');
  let cx = 0, cy = 0, rowH = 0; const R = rng(77);
  const cell = (name, w, h, fn) => { if (cx + w > S) { cx = 0; cy += rowH + 2; rowH = 0; } const u0 = cx / S, u1 = (cx + w) / S, v1 = 1 - cy / SH, v0 = 1 - (cy + h) / SH; if (cy + h > SH) console.error('atlas overflow', name, cy + h); window.__atlasH = cy + h; x.save(); x.beginPath(); x.rect(cx, cy, w, h); x.clip(); x.translate(cx, cy); fn(x, w, h); x.restore(); CELL[name] = [u0 + .0004, v0 + .0004, u1 - .0004, v1 - .0004]; cx += w + 2; rowH = Math.max(rowH, h); };
  const neon = (x, txt, X, Y, font, col, core = '#fff4e0', lw = 5, blur = 16) => { x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.shadowColor = col; x.shadowBlur = blur; x.strokeStyle = col; x.lineWidth = lw; x.strokeText(txt, X, Y); x.shadowBlur = blur * .6; x.fillStyle = core; x.fillText(txt, X, Y); x.shadowBlur = 0; };
  const plate = (x, w, h, bg, col, b = 5) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = col; x.lineWidth = b; x.strokeRect(b / 2 + 2, b / 2 + 2, w - b - 4, h - b - 4); x.fillStyle = col; const k = 6; [[6, 6], [w - 6 - k, 6], [6, h - 6 - k], [w - 6 - k, h - 6 - k]].forEach(p => x.fillRect(p[0], p[1], k, k)); };
  const vert = (x, w, h, chars, font, col, bg, core) => { plate(x, w, h, bg, col); const n = chars.length, step = (h - 24) / n; chars.forEach((c, i) => neon(x, c, w / 2, 12 + step * (i + .5), font.replace('$', Math.min(step * .88, w * .86)), col, core)); };
  const solid = (x, w, h, chars, font, bg, ink) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = ink; x.fillRect(5, 5, w - 10, 3); x.fillRect(5, h - 8, w - 10, 3); const n = chars.length, step = (h - 24) / n; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = font.replace('$', Math.min(step * .9, w * .86)); chars.forEach((c, i) => x.fillText(c, w / 2, 12 + step * (i + .5))); };
  const jp = `900 $px ${FONT_JP}`, en = `700 $px ${FONT_EN}`;
  const blades = [
    ['ラーメン', jp, PAL.yellow, 1], ['ホテル', jp, PAL.magenta], ['営業中', jp, PAL.cyan], ['酒場', jp, PAL.red], ['麵', jp, PAL.yellow], ['茶', jp, PAL.green], ['居酒屋', jp, PAL.orange], ['カラオケ', jp, PAL.magenta], ['電脳屋', jp, PAL.cyan], ['仕立屋', jp, PAL.yellow, 1], ['星屋', jp, PAL.red, 1], ['薬', jp, PAL.green],
    ['RAMEN', en, PAL.yellow], ['HOTEL', en, PAL.cyan], ['BAR', en, PAL.magenta], ['24H', en, PAL.yellow, 1], ['TAILOR', en, PAL.orange], ['CLINIC', en, PAL.cyan], ['ARCADE', en, PAL.magenta], ['MOTEL', en, PAL.red], ['NOODLE', en, PAL.yellow, 1], ['PAWN', en, PAL.green],
    ['TACOS', en, PAL.orange, 1], ['ABIERTO', en, PAL.green], ['FARMACIA', en, PAL.cyan], ['CANTINA', en, PAL.magenta], ['MERCADO', en, PAL.yellow], ['BODEGA', en, PAL.red], ['CERVEZA', en, PAL.yellow, 1], ['HOTEL AZUL', en, PAL.cyan],
  ];
  const c2 = c => '#' + c.toString(16).padStart(6, '0');
  CELL.blades = [];
  blades.forEach(([t, f, c, sol], i) => {
    const nm = 'b' + i; const chars = f === jp ? [...t] : [...t.replace(' ', '')];
    cell(nm, 76, 300, (x, w, h) => { sol ? solid(x, w, h, chars, f, c2(c), '#0a0814') : vert(x, w, h, chars, f, c2(c), '#0b0916'); });
    CELL.blades.push(nm);
  });
  const plates = [
    ['p0', 'SASTRERÍA ORO', '#f4c860', 'FINE MENSWEAR  仕立屋'], ['p1', 'TACOS EL TRONZO', '#ff9a3c', 'ABIERTO 24H'], ['p2', 'NOVA NOODLE', '#f7e84a', 'ラーメン・餃子'], ['p3', 'HOTEL PARAÍSO', '#ff2e88', 'ホテル・VACANTE'], ['p4', 'CAFÉ LUNA', '#2fe3ee', '喫茶'], ['p5', 'ROBO-WASH', '#8cff5a', 'LAVANDERÍA'], ['p6', 'FARMACIA 24H', '#2fe3ee', '薬局'], ['p7', 'GOLD DOT PAWN', '#f7e84a', 'CASH 現金'], ['p8', 'PINKLINE KARAOKE', '#ff2e88', 'カラオケ'], ['p9', 'BLUE HERON BAR', '#2fe3ee', '酒場'], ['p10', 'CANTINA CÓNDOR', '#ff3b3b', 'CERVEZA FRÍA'], ['p11', 'IRON DOG GYM', '#ff9f0a', 'OPEN 24H'],
  ];
  plates.forEach(([n, a, c, b]) => cell(n, 420, 112, (x, w, h) => { plate(x, w, h, '#0b0916', c, 4); neon(x, a, w / 2, h * .4, `800 ${a.length > 13 ? 38 : 48}px ${FONT_EN}`, c); x.font = `700 20px ${FONT_JP}`; x.fillStyle = c; x.textAlign = 'center'; x.fillText(b, w / 2, h * .78); }));
  /* big roof letters on dark */
  [['r0', 'CHISPAZ', '#f7e84a'], ['r1', 'ORIN', '#cfe6ff'], ['r2', 'NOCTELO', '#ff2e88'], ['r3', 'KAIJU', '#2fe3ee']].forEach(([n, t, c]) => cell(n, 380, 100, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#07060c'; x.fillRect(0, 0, w, h); neon(x, t, w / 2, h / 2, `900 62px ${FONT_DISP}`, c, '#fff8e8', 6, 14); }));
  /* posters: flat shapes */
  const posterCols = [['#ffdf3a', '#17102a', '#ff2e88'], ['#ff2e88', '#17102a', '#ffdf3a'], ['#2fe3ee', '#101428', '#ff3b3b'], ['#ff5a2e', '#1a0f20', '#f4e9d0'], ['#7a3cff', '#120e26', '#8cff5a'], ['#f4e9d0', '#1b1630', '#ff3b3b']];
  CELL.posters = [];
  for (let i = 0; i < 12; i++) {
    const nm = 'po' + i; CELL.posters.push(nm); const [a, b, c] = posterCols[i % posterCols.length];
    cell(nm, 128, 190, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); x.fillStyle = b; const t = i % 5; if (t === 0) { x.beginPath(); x.arc(w / 2, h * .42, 44, 0, TAU); x.fill(); x.fillStyle = c; x.fillRect(0, h * .4, w, 8); } if (t === 1) { for (let k = 0; k < 7; k++) { x.fillRect(0, k * 26 + 8, w, 11); } x.fillStyle = c; x.beginPath(); x.moveTo(20, 150); x.lineTo(108, 30); x.lineTo(108, 150); x.fill(); } if (t === 2) { x.beginPath(); x.ellipse(w * .5, h * .34, 32, 40, 0, 0, TAU); x.fill(); x.fillRect(w * .5 - 42, h * .52, 84, 70); x.fillStyle = c; x.fillRect(w * .5 - 30, h * .29, 60, 11); } if (t === 3) { x.save(); x.translate(w / 2, h * .42); for (let k = 0; k < 12; k++) { x.rotate(TAU / 12); x.fillRect(-4, 14, 8, 44); } x.restore(); x.fillStyle = c; x.beginPath(); x.arc(w / 2, h * .42, 16, 0, TAU); x.fill(); } if (t === 4) { x.fillRect(16, 16, w - 32, h * .6); x.fillStyle = c; x.beginPath(); x.moveTo(30, h * .6); x.lineTo(w / 2, 34); x.lineTo(w - 30, h * .6); x.fill(); } x.fillStyle = b; x.font = `900 ${i % 2 ? 24 : 21}px ${i % 2 ? FONT_JP : FONT_EN}`; x.textAlign = 'center'; x.fillText(['NOVA', '星屋', 'BOXEO', '祭り', 'CHISPAZ', 'LUCHA', 'カイジュウ', 'FIESTA', '夜市', 'NEON', 'TOUR', '映画'][i], w / 2, h - 28); x.font = `700 10px ${FONT_EN}`; x.fillText('24.10 — 11.03', w / 2, h - 10); });
  }
  /* street paper and small signs */
  cell('open', 200, 90, (x, w, h) => { x.fillStyle = '#05040a'; x.fillRect(0, 0, w, h); neon(x, 'ABIERTO', w / 2, h / 2, `800 46px ${FONT_EN}`, '#8cff5a'); });
  cell('tailorNeon', 480, 124, (x, w, h) => { x.clearRect(0, 0, w, h); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.font = `800 54px ${FONT_EN}`; x.strokeStyle = '#ff2a3c'; x.lineWidth = 7; x.strokeText('SASTRERÍA ORO', w / 2, h * .36); x.fillStyle = '#ffe9e2'; x.fillText('SASTRERÍA ORO', w / 2, h * .36); x.font = `700 26px ${FONT_JP}`; x.strokeStyle = '#16e4f4'; x.lineWidth = 4; x.strokeText('仕立屋 · TAILOR', w / 2, h * .8); x.fillStyle = '#eaffff'; x.fillText('仕立屋 · TAILOR', w / 2, h * .8); });
  /* the tower's mark: invented, bold */
  cell('logoV', 150, 582, (x, w0, h0) => { x.scale(150 / 196, 582 / 760); const w = 196, h = 760; x.fillStyle = '#07070b'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff2a2a'; x.fillRect(6, 6, w - 12, 8); x.fillRect(6, h - 14, w - 12, 8); x.save(); x.translate(w / 2, 112); x.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + TAU / 12; x.lineTo(Math.cos(a) * 76, Math.sin(a) * 76); } x.closePath(); x.fill(); x.fillStyle = '#07070b'; x.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + TAU / 12; x.lineTo(Math.cos(a) * 44, Math.sin(a) * 44); } x.closePath(); x.fill(); x.fillStyle = '#ff2a2a'; x.fillRect(-9, -76, 18, 70); x.restore(); x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `900 128px ${FONT_DISP}`; ['O', 'R', 'I', 'N'].forEach((c, i) => { x.fillStyle = '#fff4e6'; x.fillText(c, w / 2, 262 + i * 124); }); x.font = `900 40px ${FONT_JP}`; x.fillStyle = '#ff2a2a'; x.fillText('織', w / 2, h - 44); });
  cell('logoH', 620, 170, (x, w, h) => { x.fillStyle = '#07070b'; x.fillRect(0, 0, w, h); x.save(); x.translate(92, h / 2); x.fillStyle = '#ff2a2a'; x.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + TAU / 12; x.lineTo(Math.cos(a) * 62, Math.sin(a) * 62); } x.closePath(); x.fill(); x.fillStyle = '#07070b'; x.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + TAU / 12; x.lineTo(Math.cos(a) * 36, Math.sin(a) * 36); } x.closePath(); x.fill(); x.fillStyle = '#ff2a2a'; x.fillRect(-8, -62, 16, 56); x.restore(); x.fillStyle = '#fff4e6'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = `900 112px ${FONT_DISP}`; x.fillText('ORIN', 178, h / 2 + 6); x.fillStyle = '#ff2a2a'; x.fillRect(178, h - 18, w - 196, 6); });
  /* wall paper for pillars: tags, torn posters, stickers */
  const tagCols = ['#f6ee1c', '#16e4f4', '#ff2a2a', '#f4f0e4'];
  for (let i = 0; i < 4; i++) cell('graf' + i, 240, 110, (x, w, h) => { x.clearRect(0, 0, w, h); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.font = `400 ${[50, 44, 56, 48][i]}px ${FONT_DISP}`; x.save(); x.translate(w / 2, h / 2); x.rotate([-.08, .05, -.04, .09][i]); const t = ['RATA', 'NO 9', 'KAIJU', 'LOBO'][i]; x.strokeStyle = '#07070b'; x.lineWidth = 12; x.strokeText(t, 0, 2); x.strokeStyle = tagCols[(i + 1) % 4]; x.lineWidth = 4; x.strokeText(t, 0, 2); x.fillStyle = tagCols[i]; x.fillText(t, 0, 2); x.restore(); x.fillStyle = tagCols[i]; for (let k = 0; k < 5; k++) x.fillRect(30 + k * 44 + R() * 16, 84 + R() * 4, 2, 14 + R() * 12); });
  for (let i = 0; i < 4; i++) cell('torn' + i, 150, 200, (x, w, h) => { const a = ['#f6ee1c', '#16e4f4', '#f4f0e4', '#ff2a2a'][i], b = '#121218'; x.clearRect(0, 0, w, h); x.beginPath(); x.moveTo(0, 8 + R() * 8); for (let k = 1; k <= 8; k++) x.lineTo(k * w / 8, 2 + R() * 18); x.lineTo(w, h * .6); for (let k = 8; k >= 0; k--) x.lineTo(k * w / 8, h * (.62 + R() * .36)); x.closePath(); x.save(); x.clip(); x.fillStyle = a; x.fillRect(0, 0, w, h); x.fillStyle = b; x.font = `900 30px ${FONT_DISP}`; x.textAlign = 'center'; x.fillText(['NOVA', 'BOX', 'LUCHA', 'CHISPAZ'][i], w / 2, 66); x.fillRect(14, 84, w - 28, 8); x.font = `900 60px ${FONT_JP}`; x.fillText(['夜', '拳', '祭', '電'][i], w / 2, 150); x.restore(); });
  for (let i = 0; i < 6; i++) cell('stk' + i, 64, 64, (x, w, h) => { x.clearRect(0, 0, w, h); const c = tagCols[i % 4]; x.fillStyle = c; if (i % 3 === 0) { x.beginPath(); x.arc(32, 32, 30, 0, TAU); x.fill(); } else x.fillRect(3, 12, 58, 40); x.fillStyle = '#07070b'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `800 ${i % 2 ? 22 : 18}px ${FONT_EN}`; x.fillText(['24H', 'OK', 'VIP', 'ORO', '3F', 'WET'][i], 32, 33); });
  /* the till: real small text, marks drawn live in the shader */
  cell('till', 512, 320, (x, w, h) => {
    x.fillStyle = '#04100f'; x.fillRect(0, 0, w, h); x.fillStyle = '#0a2a2c'; x.fillRect(0, 0, w, 40); x.fillStyle = '#16e4f4'; x.font = `700 26px ${FONT_EN}`; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText('ORO-TILL 04', 14, 21); x.textAlign = 'right'; x.fillStyle = '#f6ee1c'; x.fillText('REG.OK', w - 14, 21); x.textAlign = 'left';
    x.font = `500 19px ${FONT_MONO}`; x.fillStyle = '#8ff2f6';
    ['BLAZER NAVY 42R', 'SHIRT WHT 16/34', 'TROUSER ALT.', 'STEAM + PRESS', 'SWATCH BOOK 3', 'TIE SILK OX'].forEach((t, i) => { x.fillStyle = i % 2 ? '#74d6da' : '#a8f6f8'; x.fillText(t, 16, 62 + i * 25); x.textAlign = 'right'; x.fillText(['489.00', '95.00', '40.00', '18.00', '0.00', '65.00'][i], 306, 62 + i * 25); x.textAlign = 'left'; });
    x.fillStyle = '#16e4f4'; x.fillRect(14, 208, 294, 1); x.font = `700 28px ${FONT_EN}`; x.fillStyle = '#f4f0e4'; x.fillText('TOTAL', 16, 230); x.textAlign = 'right'; x.fillText('$707.00', 306, 230); x.textAlign = 'left';
    x.font = `500 16px ${FONT_MONO}`; x.fillStyle = '#74d6da'; x.fillText('> READY', 44, 268);
    x.strokeStyle = '#ff5a50'; x.lineWidth = 1; x.strokeRect(322, 52, 172, 196); x.fillStyle = '#ff5a50'; x.font = `500 15px ${FONT_MONO}`; x.fillText('SIGNAL', 330, 70); for (let i = 0; i < 18; i++) x.fillRect(326 + i * 9.4, i % 3 ? 262 : 258, 1, i % 3 ? 6 : 10); 
  });
  cell('tablet', 360, 240, (x, w, h) => { x.fillStyle = '#04100f'; x.fillRect(0, 0, w, h); x.strokeStyle = '#16e4f4'; x.lineWidth = 2; x.save(); x.translate(92, h / 2); x.beginPath(); x.arc(0, -70, 20, 0, TAU); x.moveTo(-14, -50); x.lineTo(-44, -30); x.lineTo(-52, 30); x.moveTo(14, -50); x.lineTo(44, -30); x.lineTo(52, 30); x.moveTo(-26, -30); x.lineTo(-22, 40); x.lineTo(-24, 96); x.moveTo(26, -30); x.lineTo(22, 40); x.lineTo(24, 96); x.moveTo(-22, 40); x.lineTo(22, 40); x.stroke(); x.strokeStyle = '#ff5a50'; x.setLineDash([4, 3]); for (const yy of [-30, 0, 40]) { x.beginPath(); x.moveTo(-60, yy); x.lineTo(60, yy); x.stroke(); } x.setLineDash([]); x.restore(); x.fillStyle = '#a8f6f8'; x.font = `500 19px ${FONT_MONO}`; ['CHEST 104', 'WAIST  88', 'SLEEVE 65', 'INSEAM 81', 'NECK 16.5'].forEach((t, i) => x.fillText(t, 186, 42 + i * 34)); x.fillStyle = '#f6ee1c'; x.fillRect(186, 206, 150, 18); });
  cell('holo', 240, 300, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = '#16e4f4'; x.lineWidth = 2; x.strokeRect(6, 6, w - 12, h - 12); x.fillStyle = 'rgba(22,228,244,.12)'; x.fillRect(6, 6, w - 12, h - 12); x.fillStyle = '#16e4f4'; x.fillRect(6, 6, w - 12, 34); x.fillStyle = '#04100f'; x.font = `800 22px ${FONT_EN}`; x.textBaseline = 'middle'; x.fillText('FIT SCAN', 16, 24); x.fillStyle = '#a8f6f8'; x.font = `500 20px ${FONT_MONO}`; ['CH 104.0', 'WA  88.5', 'SL  65.0', 'IN  81.0', 'NK  41.9', 'SH  46.2'].forEach((t, i) => x.fillText(t, 18, 66 + i * 30)); x.fillStyle = '#f6ee1c'; x.fillRect(18, 252, 150, 8); x.fillRect(18, 268, 96, 8); });
  cell('goldLeafRev', 500, 120, (x, w, h) => { x.clearRect(0, 0, w, h); x.translate(w, 0); x.scale(-1, 1); x.fillStyle = '#e8c56a'; x.textAlign = 'center'; x.font = `700 56px Georgia,serif`; x.fillText('Sastrería Oro', w / 2, 56); x.font = `600 20px ${FONT_EN}`; x.fillText('BESPOKE  ·  ALTERATIONS  ·  仕立て', w / 2, 92); x.fillRect(60, 104, w - 120, 2); });
  cell('stencil', 200, 100, (x, w, h) => { x.fillStyle = '#c99b3a'; x.fillRect(0, 0, w, h); x.fillStyle = '#17102a'; for (let k = -2; k < 12; k++) { x.save(); x.translate(k * 28, 0); x.transform(1, 0, -.6, 1, 0, 0); x.fillRect(0, 0, 13, 24); x.restore(); } x.font = `800 30px ${FONT_EN}`; x.textAlign = 'center'; x.fillText('NO ENTRY', w / 2, 66); });
  cell('vendA', 150, 300, (x, w, h) => { x.fillStyle = '#10223a'; x.fillRect(0, 0, w, h); x.fillStyle = '#2fe3ee'; x.fillRect(8, 8, w - 16, 54); x.fillStyle = '#04121c'; x.font = `800 28px ${FONT_EN}`; x.textAlign = 'center'; x.fillText('自販機', w / 2, 44); const cols = ['#ff2e88', '#f7e84a', '#8cff5a', '#ff9a3c', '#fff4e0', '#2fe3ee']; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.fillStyle = cols[(i * 3 + j) % 6]; x.fillRect(13 + i * 32, 74 + j * 40, 22, 30); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(13 + i * 32, 92 + j * 40, 22, 4); } x.fillStyle = '#04121c'; x.fillRect(18, 248, 114, 34); });
  cell('vendB', 150, 300, (x, w, h) => { x.fillStyle = '#3a0f2a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff2e88'; x.fillRect(8, 8, w - 16, 54); x.fillStyle = '#fff'; x.font = `800 26px ${FONT_EN}`; x.textAlign = 'center'; x.fillText('SÚPER', w / 2, 44); const cols = ['#f7e84a', '#fff4e0', '#ff9a3c']; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { x.fillStyle = cols[(i + j) % 3]; x.beginPath(); x.arc(32 + i * 43, 96 + j * 52, 16, 0, TAU); x.fill(); } x.fillStyle = '#1a0612'; x.fillRect(18, 248, 114, 34); });
  /* room paper */
  cell('ledgerL', 300, 420, (x, w, h) => { x.fillStyle = '#efe4c6'; x.fillRect(0, 0, w, h); x.fillStyle = '#b4412f'; x.fillRect(46, 0, 2, h); x.strokeStyle = '#8fa6c0'; x.lineWidth = 1; for (let y = 44; y < h; y += 20) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); } x.fillStyle = '#23202f'; x.font = `700 22px ${FONT_EN}`; x.fillText('SHIFTS', 60, 30); x.font = `500 15px ${FONT_MONO}`; ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach((r, i) => x.fillText(r, 58, 60 + i * 40)); });
  cell('ledgerR', 300, 420, (x, w, h) => { x.fillStyle = '#ece0c0'; x.fillRect(0, 0, w, h); x.strokeStyle = '#8fa6c0'; x.lineWidth = 1; for (let y = 44; y < h; y += 20) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); } x.strokeStyle = '#23202f'; x.lineWidth = 1.6; for (let y = 54; y < h - 40; y += 20) { if (R.chance(.25)) continue; x.beginPath(); let px = 14; x.moveTo(px, y); while (px < R.range(120, 280)) { px += R.range(5, 12); x.lineTo(px, y + R.range(-6, 3)); } x.stroke(); } });
  cell('notepad', 240, 330, (x, w, h) => { x.fillStyle = '#f6eeb0'; x.fillRect(0, 0, w, h); x.fillStyle = '#cf3a30'; x.fillRect(0, 0, w, 26); x.strokeStyle = '#a8a06a'; for (let y = 50; y < h; y += 24) { x.beginPath(); x.moveTo(8, y); x.lineTo(w - 8, y); x.stroke(); } x.fillStyle = '#20204a'; x.font = `italic 700 26px Georgia,serif`; x.fillText('PAY', 16, 76); x.font = `italic 500 18px Georgia,serif`; ['hours', 'to Len?', 'copy + send'].forEach((t, i) => x.fillText(t, 16, 122 + i * 48)); x.fillStyle = '#cf3a30'; x.beginPath(); x.arc(200, 70, 14, 0, TAU); x.lineWidth = 3; x.strokeStyle = '#cf3a30'; x.stroke(); });
  cell('shoeL', 120, 60, (x, w, h) => { x.fillStyle = '#efe6d2'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1826'; x.font = `800 15px ${FONT_EN}`; x.fillText('ORO', 8, 20); x.font = `500 11px ${FONT_MONO}`; x.fillText('OXFORD  43', 8, 36); for (let i = 0; i < 26; i++) { x.fillRect(8 + i * 4, 42, R.chance(.5) ? 1 : 2, 12); } });
  cell('tag', 40, 72, (x, w, h) => { x.fillStyle = '#f2ead6'; x.fillRect(0, 0, w, h); x.fillStyle = '#c9a050'; x.beginPath(); x.arc(20, 10, 4, 0, TAU); x.fill(); x.fillStyle = '#1a1826'; x.font = `700 11px ${FONT_EN}`; x.textAlign = 'center'; x.fillText('ORO', 20, 34); x.fillRect(8, 44, 24, 2); x.fillRect(8, 52, 16, 2); });
  cell('card', 100, 60, (x, w, h) => { x.fillStyle = '#17121f'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8c56a'; x.font = `700 14px Georgia,serif`; x.textAlign = 'center'; x.fillText('Sastrería Oro', w / 2, 30); x.fillRect(20, 40, 60, 1); });
  cell('sw0', 96, 96, (x, w, h) => { x.fillStyle = '#26324e'; x.fillRect(0, 0, w, h); x.strokeStyle = '#8fa2c0'; for (let i = 0; i < 12; i++) x.strokeRect(-1, i * 8, w + 2, 0.5); for (let i = 0; i < 12; i++) x.strokeRect(i * 8, -1, 0.5, h + 2); });
  cell('frame', 160, 200, (x, w, h) => { x.fillStyle = '#1c1830'; x.fillRect(0, 0, w, h); x.fillStyle = '#efe4c6'; x.fillRect(14, 14, w - 28, h - 28); x.fillStyle = '#2a2138'; x.beginPath(); x.arc(w / 2, 76, 24, 0, TAU); x.fill(); x.fillRect(w / 2 - 34, 100, 68, 70); x.fillStyle = '#efe4c6'; x.beginPath(); x.moveTo(w / 2 - 12, 100); x.lineTo(w / 2 + 12, 100); x.lineTo(w / 2, 142); x.fill(); });
  cell('sale', 150, 80, (x, w, h) => { x.fillStyle = '#e8c56a'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1420'; x.font = `800 22px ${FONT_EN}`; x.textAlign = 'center'; x.fillText('MADE TO MEASURE', w / 2, 34); x.font = `700 16px ${FONT_JP}`; x.fillText('採寸・仕立て', w / 2, 60); });
  cell('ticket', 110, 180, (x, w, h) => { x.fillStyle = '#ece4d0'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1826'; x.font = `500 11px ${FONT_MONO}`; for (let i = 0; i < 9; i++) x.fillRect(8, 16 + i * 16, R.range(40, 92), 3); });
  cell('rug', 420, 256, (x, w, h) => { const Rr = rng(808); x.fillStyle = '#3a2430'; x.fillRect(0, 0, w, h);
    /* outer border, guard stripes, then a quiet field */
    const band = (m, c) => { x.fillStyle = c; x.fillRect(m, m, w - 2 * m, h - 2 * m); };
    band(0, '#20161e'); band(6, '#7e6a40'); band(8, '#3a2028'); band(24, '#7e6a40'); band(26, '#1e1824'); band(28, '#262a32');
    /* one thin line inside the border */
    x.strokeStyle = 'rgba(142,122,76,.35)'; x.lineWidth = 2; x.strokeRect(44, 44, w - 88, h - 88);
    /* woven threads over everything, and wear down the walked line */
    for (let i = 0; i < 9000; i++) { x.fillStyle = Rr() < .5 ? 'rgba(255,240,220,.05)' : 'rgba(0,0,0,.1)'; x.fillRect(Rr() * w, Rr() * h, 2, 1); }
    x.strokeStyle = 'rgba(0,0,0,.08)'; x.lineWidth = 1; for (let i = 0; i < h; i += 2) { x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
    const G = x.createLinearGradient(0, 0, 0, h); G.addColorStop(.25, 'rgba(190,170,150,0)'); G.addColorStop(.5, 'rgba(190,170,150,.13)'); G.addColorStop(.75, 'rgba(190,170,150,0)'); x.fillStyle = G; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#b09a68'; x.lineWidth = 1; for (let i = 0; i < 36; i++) { x.beginPath(); x.moveTo(0, 6 + i * 7); x.lineTo(5, 6 + i * 7); x.moveTo(w, 6 + i * 7); x.lineTo(w - 5, 6 + i * 7); x.stroke(); } });
  cell('oroBlade', 110, 460, (x, w, h) => { x.fillStyle = '#0c0a08'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e8c56a'; x.lineWidth = 3; x.strokeRect(5, 5, w - 10, h - 10); neon(x, '裁', w / 2, 64, '900 72px ' + FONT_JP, '#ffb040', '#fff4d8', 3, 12); neon(x, '縫', w / 2, 146, '900 72px ' + FONT_JP, '#ffb040', '#fff4d8', 3, 12); neon(x, 'ORO', w / 2, 232, '900 34px ' + FONT_DISP, '#16e4f4', '#e8ffff', 3, 10); for (let i = 0; i < 4; i++) { x.fillStyle = '#e8c56a'; x.fillRect(22, 266 + i * 8, w - 44, 2); } neon(x, 'SASTRE', w / 2, 330, '700 22px ' + FONT_EN, '#ffb040', '#fff4d8', 2, 8); x.strokeStyle = '#ffe0a0'; x.lineWidth = 3; x.beginPath(); x.moveTo(36, 372); x.lineTo(74, 432); x.moveTo(74, 372); x.lineTo(36, 432); x.stroke(); x.beginPath(); x.arc(33, 438, 8, 0, TAU); x.arc(77, 438, 8, 0, TAU); x.stroke(); });
  cell('gymRoof', 512, 128, (x, w, h) => { x.fillStyle = '#0c0806'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ff9a3c'; x.lineWidth = 3; x.strokeRect(4, 4, w - 8, h - 8); neon(x, 'FUERZA', 214, h / 2 + 2, '900 74px ' + FONT_DISP, '#ff7a1e', '#fff0d8', 4, 14); neon(x, '鉄', 440, h / 2, '900 76px ' + FONT_JP, '#ff7a1e', '#fff0d8', 3, 12); x.fillStyle = '#ffe0b0'; x.fillRect(20, h - 18, 370, 3); });
  cell('tv', 240, 150, (x, w, h) => { x.fillStyle = '#0a1420'; x.fillRect(0, 0, w, h); x.fillStyle = '#2fe3ee'; x.font = `700 22px ${FONT_EN}`; x.fillText('CH.09 ▸ RAIN', 12, 30); x.fillStyle = '#ff2e88'; x.fillRect(12, 46, 90, 90); x.fillStyle = '#f7e84a'; x.font = `900 26px ${FONT_JP}`; x.fillText('星', 42, 102); x.fillStyle = '#7fa6c0'; for (let i = 0; i < 6; i++) x.fillRect(116, 50 + i * 15, R.range(50, 110), 5); });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = 8; tex.flipY = true; tex.premultiplyAlpha = false;
  return tex;
}
const bladeCell = i => CELL[CELL.blades[((i % CELL.blades.length) + CELL.blades.length) % CELL.blades.length]];

/* ---------- animated ad screens, 4x4 cells: lit like photographs, gradients and a subject, not icons ---------- */
function drawAds() {
  const W = 2048, H = 4096, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  const W0 = '#f4f0e4', R = rng(1311); if (!x.roundRect) x.roundRect = function (a, b, c, d) { this.rect(a, b, c, d); };
  const lg = (x0, y0, x1, y1, ...st) => { const G = x.createLinearGradient(x0, y0, x1, y1); st.forEach((c, i) => G.addColorStop(i / (st.length - 1), c)); return G; };
  const rg = (cx, cy, r, ...st) => { const G = x.createRadialGradient(cx, cy, 0, cx, cy, r); st.forEach((c, i) => G.addColorStop(i / (st.length - 1), c)); return G; };
  const all = f => { x.fillStyle = f; x.fillRect(0, 0, 256, 384); };
  const disc = (cx, cy, r, c, c1 = 'rgba(0,0,0,0)') => { x.fillStyle = rg(cx, cy, r, c, c1); x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); };
  const add = fn => { x.globalCompositeOperation = 'lighter'; fn(); x.globalCompositeOperation = 'source-over'; };
  const smoke = (n, c, y0, y1, r0 = 26, r1 = 80) => add(() => { for (let i = 0; i < n; i++) disc(R() * 256, lerp(y0, y1, R()), R.range(r0, r1), c); });
  const poly = (...p) => { x.beginPath(); p.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1])); x.closePath(); };
  const rim = (c, lw = 1.6, blur = 10) => { x.strokeStyle = c; x.lineWidth = lw; x.shadowColor = c; x.shadowBlur = blur; x.stroke(); x.shadowBlur = 0; };
  const cone = (cx, top, wd, h, c) => { const G = lg(cx, top, cx, top + h, c, 'rgba(0,0,0,0)'); x.fillStyle = G; poly([cx - 3, top], [cx + 3, top], [cx + wd, top + h], [cx - wd, top + h]); x.fill(); };
  /* a head and shoulders in profile, lit from the right */
  const bust = (hi, lo, rc, hairA, hairB) => {
    x.beginPath(); x.moveTo(40, 384); x.bezierCurveTo(46, 330, 78, 310, 90, 286); x.lineTo(84, 232); x.bezierCurveTo(60, 190, 62, 120, 100, 92); x.bezierCurveTo(130, 70, 160, 84, 166, 118); x.lineTo(168, 130); x.lineTo(184, 160); x.quadraticCurveTo(182, 168, 170, 168); x.lineTo(174, 178); x.lineTo(166, 184); x.lineTo(172, 194); x.lineTo(162, 204); x.quadraticCurveTo(164, 224, 146, 232); x.quadraticCurveTo(130, 240, 126, 262); x.bezierCurveTo(130, 290, 190, 304, 222, 330); x.lineTo(250, 384); x.closePath();
    x.fillStyle = lg(70, 0, 186, 0, lo, lo, hi); x.fill(); x.save(); x.clip(); x.fillStyle = lg(0, 226, 0, 292, 'rgba(0,0,0,.72)', 'rgba(0,0,0,0)'); x.fillRect(60, 226, 110, 66); disc(150, 158, 26, 'rgba(255,70,70,.32)'); x.restore(); rim(rc);
    x.beginPath(); x.moveTo(34, 340); x.bezierCurveTo(8, 180, 40, 58, 118, 54); x.bezierCurveTo(172, 50, 198, 92, 176, 128); x.bezierCurveTo(150, 100, 118, 102, 106, 130); x.bezierCurveTo(92, 172, 104, 240, 86, 304); x.lineTo(60, 384); x.lineTo(18, 384); x.closePath(); x.fillStyle = lg(30, 60, 170, 120, hairA, hairB); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = .8; for (let i = 0; i < 16; i++) { x.beginPath(); x.moveTo(60 + i * 5, 70 + i); x.bezierCurveTo(30 + i * 3, 140, 40 + i * 3, 240, 34 + i * 3, 360); x.stroke(); }
    x.fillStyle = '#f4efe6'; x.beginPath(); x.ellipse(153, 133, 9, 4, .08, 0, TAU); x.fill(); x.fillStyle = '#0a0a10'; x.beginPath(); x.arc(156, 133, 3.6, 0, TAU); x.fill(); x.fillStyle = '#111'; x.fillRect(140, 122, 24, 2.2);
    x.fillStyle = lg(0, 176, 0, 196, '#ff4a50', '#7a0a18'); x.beginPath(); x.moveTo(164, 180); x.quadraticCurveTo(172, 174, 174, 179); x.lineTo(166, 184); x.lineTo(172, 193); x.quadraticCurveTo(166, 196, 162, 190); x.closePath(); x.fill();
  };
  const art = [
    /* idol, cyber cheek */ () => { all(lg(0, 0, 256, 384, '#061a24', '#3a0812')); add(() => disc(210, 110, 170, 'rgba(255,40,50,.55)')); smoke(5, 'rgba(40,180,200,.06)', 40, 300); bust('#ffd0b0', '#2a1416', '#ff5a5a', '#070710', '#19304a'); x.strokeStyle = '#2fe3ee'; x.lineWidth = 1.4; x.shadowColor = '#2fe3ee'; x.shadowBlur = 7; x.beginPath(); x.moveTo(150, 150); x.lineTo(126, 160); x.lineTo(116, 196); x.moveTo(146, 141); x.lineTo(112, 146); x.stroke(); x.shadowBlur = 0; x.fillStyle = '#ffe9a8'; x.font = '900 24px ' + FONT_JP; x.textAlign = 'center'; x.textBaseline = 'middle'; [...'星夜'].forEach((t, i) => x.fillText(t, 232, 36 + i * 30)); },
    /* a real bowl with steam */ () => { all(lg(0, 0, 0, 384, '#1a0a06', '#050303')); add(() => disc(128, 170, 170, 'rgba(255,150,50,.34)')); x.fillStyle = lg(30, 0, 226, 0, '#1a0406', '#a81a22', '#ff5a3c', '#7a0c14', '#120204'); x.beginPath(); x.moveTo(26, 176); x.quadraticCurveTo(36, 272, 98, 286); x.lineTo(158, 286); x.quadraticCurveTo(220, 272, 230, 176); x.closePath(); x.fill(); x.fillStyle = '#0a0406'; x.beginPath(); x.ellipse(128, 292, 40, 7, 0, 0, TAU); x.fill(); x.fillStyle = lg(0, 150, 0, 200, '#fff0d8', '#b88a60'); x.beginPath(); x.ellipse(128, 176, 104, 30, 0, 0, TAU); x.fill(); x.fillStyle = rg(128, 176, 100, '#ffcf70', '#e08a28', '#7a3a10'); x.beginPath(); x.ellipse(128, 176, 96, 25, 0, 0, TAU); x.fill(); x.lineWidth = 2.2; for (let i = 0; i < 26; i++) { x.strokeStyle = i % 3 ? '#fff0b0' : '#e8c070'; x.beginPath(); const a = -70 + i * 5.4, b = 156 + R() * 40; x.moveTo(128 + a, b); x.bezierCurveTo(128 + a + 24, b - 14, 128 + a - 14, b + 12, 128 + a + 26, b - 2); x.stroke(); } x.fillStyle = '#fff6e4'; x.beginPath(); x.ellipse(170, 170, 22, 13, -.2, 0, TAU); x.fill(); x.fillStyle = rg(172, 170, 10, '#ffb020', '#d87010'); x.beginPath(); x.arc(172, 170, 9, 0, TAU); x.fill(); for (const [a, b] of [[160, 38], [186, 30]]) { x.strokeStyle = lg(a, b, 110, 170, '#d8a060', '#5a2a10'); x.lineWidth = 5; x.beginPath(); x.moveTo(a, b); x.lineTo(a - 56, 166); x.stroke(); } smoke(14, 'rgba(255,230,210,.05)', 20, 150, 20, 46); },
    /* a cold can on black */ () => { all('#020608'); add(() => { disc(128, 150, 200, 'rgba(20,190,220,.42)'); disc(60, 300, 90, 'rgba(255,240,60,.14)'); }); smoke(8, 'rgba(60,200,230,.07)', 30, 300); x.fillStyle = lg(70, 0, 186, 0, '#04161c', '#0fa8bc', '#c8fbff', '#18c4d8', '#031014'); x.fillRect(70, 62, 116, 216); x.fillStyle = lg(70, 0, 186, 0, '#3a3e44', '#c8ccd0', '#fff', '#8a8e94', '#25282c'); x.beginPath(); x.ellipse(128, 62, 58, 11, 0, 0, TAU); x.fill(); x.fillStyle = lg(0, 278, 0, 292, '#6a6e74', '#16181a'); x.beginPath(); x.ellipse(128, 278, 58, 11, 0, 0, TAU); x.fill(); x.fillStyle = lg(70, 0, 186, 0, '#120a00', '#c8a808', '#fff36a', '#b09006', '#100800'); poly([136, 104], [96, 182], [122, 182], [106, 250], [162, 158], [132, 158]); x.fill(); x.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 60; i++) { x.beginPath(); x.arc(74 + R() * 108, 76 + R() * 196, R() * 1.5, 0, TAU); x.fill(); } },
    /* department store: coat, backlit in red haze */ () => { all(lg(0, 0, 0, 384, '#2a0408', '#08020a')); add(() => { disc(128, 150, 180, 'rgba(255,40,40,.7)'); cone(128, -10, 90, 300, 'rgba(255,220,180,.22)'); }); smoke(8, 'rgba(255,80,60,.07)', 180, 330); x.beginPath(); x.moveTo(118, 66); x.quadraticCurveTo(128, 50, 140, 62); x.quadraticCurveTo(148, 82, 138, 96); x.lineTo(140, 108); x.quadraticCurveTo(172, 116, 176, 146); x.lineTo(186, 240); x.lineTo(172, 244); x.lineTo(166, 180); x.lineTo(190, 340); x.lineTo(64, 340); x.lineTo(90, 180); x.lineTo(84, 244); x.lineTo(70, 240); x.lineTo(80, 146); x.quadraticCurveTo(84, 116, 116, 108); x.lineTo(116, 94); x.closePath(); x.fillStyle = lg(70, 0, 190, 0, '#0a0408', '#2a0c12', '#100408'); x.fill(); rim('#ff7060', 1.2, 8); x.fillStyle = '#f6ee1c'; x.font = '900 40px ' + FONT_DISP; x.textAlign = 'left'; x.textBaseline = 'top'; x.fillText('-50', 12, 12); x.font = '900 18px ' + FONT_DISP; x.fillText('%', 92, 16); },
    /* an eye, close up */ () => { all(lg(0, 0, 0, 384, '#2a1a18', '#120808')); x.fillStyle = lg(0, 70, 0, 280, '#7a4e3e', '#c08a6e', '#6a3c30'); x.beginPath(); x.ellipse(128, 165, 150, 110, 0, 0, TAU); x.fill(); x.beginPath(); x.moveTo(8, 170); x.bezierCurveTo(60, 88, 190, 76, 248, 158); x.bezierCurveTo(190, 238, 70, 244, 8, 170); x.closePath(); x.fillStyle = lg(0, 110, 0, 230, '#c8bcb0', '#f6efe8', '#a89888'); x.fill(); x.save(); x.clip(); x.fillStyle = rg(128, 160, 66, '#031014', '#0a4a58', '#16e4f4', '#0a6a7a', '#02141a'); x.beginPath(); x.arc(128, 160, 66, 0, TAU); x.fill(); x.strokeStyle = 'rgba(190,250,255,.5)'; x.lineWidth = .7; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; x.beginPath(); x.moveTo(128 + Math.cos(a) * 24, 160 + Math.sin(a) * 24); x.lineTo(128 + Math.cos(a) * 60, 160 + Math.sin(a) * 60); x.stroke(); } x.fillStyle = '#010204'; x.beginPath(); x.arc(128, 160, 24, 0, TAU); x.fill(); x.strokeStyle = '#ff3a3a'; x.lineWidth = 1.2; x.beginPath(); x.arc(128, 160, 44, -1, 1); x.stroke(); x.beginPath(); x.arc(128, 160, 44, 2.1, 4.1); x.stroke(); x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.ellipse(152, 128, 13, 7, -.5, 0, TAU); x.fill(); x.fillStyle = 'rgba(0,0,0,.42)'; x.fillRect(0, 60, 256, 50); x.restore(); x.lineCap = 'round'; x.strokeStyle = '#120808'; x.lineWidth = 3.4; x.beginPath(); x.moveTo(8, 170); x.bezierCurveTo(60, 88, 190, 76, 248, 158); x.stroke(); x.lineWidth = 1.6; for (let i = 0; i < 20; i++) { const u = i / 19, px = 20 + u * 216, py = 145 - Math.sin(u * 3.14) * 48; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (u - .5) * 16, py - 18); x.stroke(); } x.lineCap = 'butt'; },
    /* a sneaker on a lit floor */ () => { all(lg(0, 0, 0, 384, '#04181e', '#020507')); add(() => { disc(128, 150, 170, 'rgba(22,200,230,.42)'); }); x.fillStyle = lg(0, 0, 0, 90, 'rgba(255,255,255,.04)', 'rgba(0,0,0,0)'); x.fillRect(0, 262, 256, 90); const shoe = () => { x.beginPath(); x.moveTo(20, 148); x.quadraticCurveTo(32, 120, 74, 118); x.lineTo(92, 136); x.quadraticCurveTo(136, 182, 196, 188); x.quadraticCurveTo(238, 194, 240, 232); x.lineTo(240, 248); x.lineTo(16, 248); x.closePath(); x.fillStyle = lg(20, 110, 60, 250, '#f8f4ec', '#b8b4ae', '#6c6a68'); x.fill(); x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 1; x.stroke(); x.fillStyle = lg(0, 180, 0, 234, '#ff5040', '#8a1016'); x.beginPath(); x.moveTo(50, 232); x.quadraticCurveTo(110, 206, 172, 212); x.quadraticCurveTo(120, 226, 70, 244); x.closePath(); x.fill(); x.fillStyle = lg(0, 246, 0, 268, '#f4f0e6', '#7a7a78'); x.fillRect(12, 244, 232, 22); x.fillStyle = '#16e4f4'; x.fillRect(12, 260, 232, 5); x.strokeStyle = '#1a1a20'; x.lineWidth = 2.6; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(92 + i * 15, 134 + i * 11); x.lineTo(112 + i * 15, 124 + i * 11); x.stroke(); } }; x.save(); x.translate(0, 8); shoe(); x.restore(); x.save(); x.translate(0, 556); x.scale(1, -1); x.globalAlpha = .22; shoe(); x.restore(); x.globalAlpha = 1; },
    /* beach sunset */ () => { all(lg(0, 0, 0, 240, '#1a1040', '#a8344c', '#ff8a34', '#ffd27a')); add(() => disc(158, 212, 96, 'rgba(255,230,160,.9)')); for (let i = 0; i < 9; i++) { x.fillStyle = 'rgba(70,20,60,' + (.16 + i * .03) + ')'; x.beginPath(); x.ellipse(R() * 256, 40 + i * 20, 90 + R() * 60, 5 + R() * 6, 0, 0, TAU); x.fill(); } x.fillStyle = lg(0, 232, 0, 384, '#c86a34', '#2a1020', '#060410'); x.fillRect(0, 232, 256, 152); add(() => { for (let i = 0; i < 70; i++) { const u = i / 70, w = 8 + u * 46; x.fillStyle = 'rgba(255,210,130,' + (.34 - u * .25) + ')'; x.fillRect(158 - w / 2 + (R() - .5) * 40 * (1 + u), 234 + u * 110, w * R(), 1.6); } }); x.strokeStyle = '#08040c'; x.lineWidth = 7; x.beginPath(); x.moveTo(34, 320); x.quadraticCurveTo(44, 190, 82, 112); x.stroke(); x.fillStyle = '#08040c'; for (let i = 0; i < 8; i++) { x.save(); x.translate(82, 112); x.rotate(i / 8 * TAU + .3); x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(38, -16, 76, 18); x.quadraticCurveTo(36, 3, 0, 5); x.fill(); x.restore(); } },
    /* glossy capsules, deep blue */ () => { all(lg(0, 0, 256, 384, '#061030', '#02040c')); add(() => { for (let i = 0; i < 12; i++) disc(R() * 256, R() * 280, R.range(12, 44), 'rgba(60,120,255,.1)'); }); for (const [cx, cy, a, k] of [[132, 112, -.65, 1.1], [62, 214, .5, .72], [186, 232, 1.2, .62]]) { x.save(); x.translate(cx, cy); x.rotate(a); x.scale(k, k); x.fillStyle = lg(0, -42, 0, 42, '#d8fbff', '#16c8dc', '#05404a'); x.beginPath(); x.arc(-44, 0, 40, Math.PI / 2, -Math.PI / 2); x.lineTo(0, -40); x.lineTo(0, 40); x.fill(); x.fillStyle = lg(0, -42, 0, 42, '#fff', '#dcd8d0', '#5a5a60'); x.beginPath(); x.arc(44, 0, 40, -Math.PI / 2, Math.PI / 2); x.lineTo(0, 40); x.lineTo(0, -40); x.fill(); x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(-20, -22, 40, 5, 0, 0, TAU); x.fill(); x.restore(); } },
    /* lips, close */ () => { all(lg(0, 0, 0, 384, '#3a1a18', '#100606')); x.fillStyle = rg(128, 170, 230, '#ffc0b0', '#f07a90', '#a02a6a'); x.fillRect(0, 0, 256, 384); x.beginPath(); x.moveTo(10, 170); x.bezierCurveTo(60, 92, 104, 104, 128, 122); x.bezierCurveTo(152, 104, 196, 92, 246, 170); x.bezierCurveTo(196, 274, 60, 274, 10, 170); x.closePath(); x.fillStyle = lg(0, 100, 0, 262, '#d81028', '#ff2a3a', '#a00818', '#ff4a50', '#6a0410'); x.fill(); x.fillStyle = '#16020a'; x.beginPath(); x.moveTo(30, 172); x.quadraticCurveTo(128, 150, 226, 172); x.quadraticCurveTo(128, 196, 30, 172); x.fill(); x.fillStyle = lg(0, 164, 0, 186, '#fff', '#b8b0a4'); for (let i = 0; i < 7; i++) x.fillRect(70 + i * 17, 164 + Math.abs(i - 3) * 1.3, 14, 12); add(() => { x.fillStyle = 'rgba(255,220,220,.55)'; x.beginPath(); x.ellipse(120, 226, 58, 9, 0, 0, TAU); x.fill(); x.beginPath(); x.ellipse(82, 128, 22, 5, -.4, 0, TAU); x.fill(); x.beginPath(); x.ellipse(176, 128, 22, 5, .4, 0, TAU); x.fill(); }); },
    /* singer backlit, amber spots */ () => { all(lg(0, 0, 0, 384, '#120806', '#040203')); add(() => { cone(40, -10, 80, 360, 'rgba(255,190,60,.34)'); cone(216, -10, 80, 360, 'rgba(255,120,40,.3)'); cone(128, -10, 60, 300, 'rgba(255,230,160,.34)'); disc(128, 130, 120, 'rgba(255,170,60,.42)'); }); smoke(10, 'rgba(255,170,90,.06)', 120, 330); x.fillStyle = '#060405'; x.beginPath(); x.ellipse(128, 118, 30, 37, 0, 0, TAU); x.fill(); x.beginPath(); x.moveTo(114, 148); x.lineTo(112, 176); x.quadraticCurveTo(52, 190, 34, 262); x.lineTo(20, 384); x.lineTo(236, 384); x.lineTo(222, 262); x.quadraticCurveTo(204, 190, 144, 176); x.lineTo(142, 148); x.closePath(); x.fill(); rim('#ffc060', 1.2, 8); x.strokeStyle = '#060405'; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.moveTo(70, 256); x.quadraticCurveTo(94, 200, 124, 158); x.stroke(); x.lineCap = 'butt'; x.fillStyle = lg(112, 0, 136, 0, '#2a2a2e', '#c8c8cc', '#1a1a1c'); x.beginPath(); x.arc(126, 152, 11, 0, TAU); x.fill(); },
    /* a sake bottle in warm dark */ () => { all(lg(0, 0, 256, 384, '#180604', '#050202')); add(() => disc(170, 120, 170, 'rgba(255,90,40,.42)')); x.fillStyle = lg(70, 0, 170, 0, '#040806', '#123a2a', '#7ad8a8', '#0e3022', '#020402'); x.beginPath(); x.moveTo(104, 28); x.lineTo(136, 28); x.lineTo(136, 104); x.quadraticCurveTo(170, 128, 170, 164); x.lineTo(170, 318); x.quadraticCurveTo(170, 330, 158, 330); x.lineTo(82, 330); x.quadraticCurveTo(70, 330, 70, 318); x.lineTo(70, 164); x.quadraticCurveTo(70, 128, 104, 104); x.closePath(); x.fill(); x.fillStyle = lg(70, 0, 170, 0, '#6a6450', '#f4ecd8', '#fff', '#c8bea4', '#5a5444'); x.fillRect(70, 176, 100, 110); x.fillStyle = '#b01818'; x.font = '900 72px ' + FONT_JP; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('酒', 120, 232); x.fillStyle = lg(186, 0, 244, 0, '#8a8478', '#f4ecdc', '#7a7468'); x.beginPath(); x.moveTo(190, 268); x.lineTo(240, 268); x.lineTo(232, 330); x.lineTo(198, 330); x.closePath(); x.fill(); x.fillStyle = rg(215, 268, 26, '#f6d890', '#c89a50'); x.beginPath(); x.ellipse(215, 268, 25, 6, 0, 0, TAU); x.fill(); },
    /* hotel tower at dusk */ () => { all(lg(0, 0, 0, 340, '#040c24', '#143068', '#c84a54', '#ffb060')); x.fillStyle = '#efe6d0'; x.beginPath(); x.arc(198, 56, 18, 0, TAU); x.fill(); x.fillStyle = 'rgba(8,16,44,.92)'; x.beginPath(); x.arc(206, 50, 16, 0, TAU); x.fill(); x.fillStyle = lg(58, 0, 170, 0, '#020208', '#101428', '#04040c'); x.beginPath(); x.moveTo(58, 340); x.lineTo(58, 110); x.lineTo(96, 66); x.lineTo(150, 66); x.lineTo(170, 96); x.lineTo(170, 340); x.closePath(); x.fill(); add(() => { for (let j = 0; j < 22; j++) for (let i = 0; i < 9; i++) if (R() < .55) { x.fillStyle = R() < .2 ? 'rgba(130,220,255,.95)' : 'rgba(255,200,120,' + R.range(.4, 1) + ')'; x.fillRect(66 + i * 11.4, 92 + j * 11, 8, 6); } disc(114, 66, 46, 'rgba(22,228,244,.5)'); }); x.fillStyle = 'rgba(6,6,16,.9)'; x.fillRect(0, 320, 256, 64); },
    /* a car in side light on wet floor */ () => { all(lg(0, 0, 0, 384, '#180408', '#040206')); add(() => { x.fillStyle = lg(0, 150, 0, 190, 'rgba(255,40,50,0)', 'rgba(255,40,50,.5)', 'rgba(255,40,50,0)'); x.fillRect(0, 150, 256, 40); disc(40, 200, 110, 'rgba(255,40,50,.34)'); }); const car = () => { x.beginPath(); x.moveTo(4, 232); x.quadraticCurveTo(14, 206, 58, 198); x.quadraticCurveTo(84, 164, 130, 162); x.quadraticCurveTo(172, 164, 196, 198); x.quadraticCurveTo(240, 204, 252, 226); x.lineTo(252, 250); x.lineTo(4, 250); x.closePath(); x.fillStyle = lg(0, 160, 0, 252, '#f4f0ec', '#b01820', '#3a060c', '#0a0204'); x.fill(); x.fillStyle = lg(70, 0, 190, 0, '#040408', '#26303e', '#04040a'); x.beginPath(); x.moveTo(72, 198); x.quadraticCurveTo(92, 174, 130, 172); x.quadraticCurveTo(160, 174, 180, 198); x.closePath(); x.fill(); for (const c of [58, 198]) { x.fillStyle = '#040406'; x.beginPath(); x.arc(c, 250, 24, 0, TAU); x.fill(); x.fillStyle = rg(c, 250, 15, '#d8d8dc', '#3a3a40'); x.beginPath(); x.arc(c, 250, 14, 0, TAU); x.fill(); } add(() => { x.fillStyle = 'rgba(255,240,200,1)'; x.fillRect(238, 216, 16, 6); disc(250, 219, 60, 'rgba(255,230,180,.5)'); disc(6, 226, 22, 'rgba(255,30,30,.8)'); }); }; car(); x.save(); x.translate(0, 548); x.scale(1, -1); x.globalAlpha = .28; car(); x.restore(); x.globalAlpha = 1; },
    /* a boxer, smoke, orange rim */ () => { all(lg(0, 0, 0, 384, '#1a0a02', '#060301')); add(() => { disc(128, 110, 170, 'rgba(255,120,20,.6)'); cone(128, -20, 90, 340, 'rgba(255,190,110,.26)'); }); smoke(10, 'rgba(255,130,60,.06)', 150, 330); const dk = lg(50, 0, 210, 0, '#120806', '#3a1a0c', '#0a0403'); x.fillStyle = dk; x.beginPath(); x.ellipse(128, 118, 28, 34, 0, 0, TAU); x.fill(); x.beginPath(); x.moveTo(112, 146); x.quadraticCurveTo(62, 158, 56, 204); x.lineTo(72, 300); x.lineTo(70, 384); x.lineTo(186, 384); x.lineTo(184, 300); x.lineTo(200, 204); x.quadraticCurveTo(194, 158, 144, 146); x.closePath(); x.fill(); rim('#ff9a3c', 1.4, 9); x.lineCap = 'round'; x.strokeStyle = dk; x.lineWidth = 22; x.beginPath(); x.moveTo(62, 196); x.lineTo(40, 158); x.lineTo(82, 106); x.moveTo(194, 196); x.lineTo(216, 158); x.lineTo(174, 106); x.stroke(); x.lineCap = 'butt'; for (const [cx, cy] of [[86, 92], [170, 92]]) { x.fillStyle = rg(cx - 6, cy - 8, 32, '#ff6a4a', '#a81418', '#3a0408'); x.beginPath(); x.ellipse(cx, cy, 25, 29, 0, 0, TAU); x.fill(); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(cx - 8, cy - 14, 9, 4, -.5, 0, TAU); x.fill(); } },
    /* a phone held up with a koi on its screen */ () => { all(lg(0, 0, 256, 384, '#021418', '#02060a')); add(() => disc(128, 150, 180, 'rgba(22,228,244,.42)')); x.fillStyle = lg(58, 0, 198, 0, '#1a1c20', '#70747c', '#26282c'); x.beginPath(); x.roundRect(58, 20, 140, 282, 18); x.fill(); x.save(); x.beginPath(); x.roundRect(64, 28, 128, 266, 13); x.clip(); x.fillStyle = lg(0, 28, 0, 294, '#06404c', '#0a8a9a', '#04202a'); x.fillRect(64, 28, 128, 266); x.strokeStyle = 'rgba(190,255,255,.22)'; x.lineWidth = 1; for (let j = 0; j < 7; j++) { x.beginPath(); for (let i = 0; i <= 10; i++) x.lineTo(64 + i * 13, 50 + j * 36 + Math.sin(i + j) * 6); x.stroke(); } x.beginPath(); x.moveTo(90, 60); x.quadraticCurveTo(188, 80, 168, 170); x.quadraticCurveTo(154, 230, 104, 262); x.quadraticCurveTo(138, 200, 118, 150); x.quadraticCurveTo(108, 100, 90, 60); x.closePath(); x.fillStyle = lg(90, 60, 170, 200, '#fff', '#f4e8d8', '#c8b8a8'); x.fill(); x.fillStyle = rg(146, 118, 26, '#ff5a30', '#b81408'); x.beginPath(); x.ellipse(146, 118, 18, 24, .2, 0, TAU); x.fill(); x.beginPath(); x.ellipse(138, 186, 14, 20, .4, 0, TAU); x.fill(); x.fillStyle = '#04060a'; x.beginPath(); x.arc(106, 76, 3.4, 0, TAU); x.fill(); x.restore(); },
    /* festival lanterns out of focus over a crowd */ () => { all(lg(0, 0, 0, 384, '#14060a', '#2a0a06')); add(() => { for (let i = 0; i < 36; i++) { const r = R.range(10, 34); const cx = R() * 256, cy = 14 + R() * 200; disc(cx, cy, r, R.pick(['rgba(255,90,48,.7)', 'rgba(255,192,64,.7)', 'rgba(255,48,64,.6)', 'rgba(255,216,112,.7)']), 'rgba(0,0,0,.02)'); } }); x.fillStyle = '#f8e8b0'; x.shadowColor = '#ffb040'; x.shadowBlur = 16; x.font = '900 128px ' + FONT_JP; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('祭', 128, 132); x.shadowBlur = 0; x.fillStyle = '#060304'; for (let i = 0; i < 16; i++) { const cx = i * 18 + R() * 8, top = 250 + R() * 26; x.beginPath(); x.ellipse(cx, top, 9, 11, 0, 0, TAU); x.fill(); x.beginPath(); x.moveTo(cx - 14, top + 12); x.quadraticCurveTo(cx, top + 6, cx + 14, top + 12); x.lineTo(cx + 15, 384); x.lineTo(cx - 15, 384); x.fill(); } },
  ];
  const WASH = ['#5c1030', '#70260a', '#0a6484', '#801018', '#4e2c1c', '#0a606e', '#100408', '#1248c8', '#2a0418', '#6e3c08', '#6e1c0a', '#10346e', '#700a18', '#7e3c08', '#0a606e', '#5e1c08'];
  const words = [['ZENKIRA', 'アイドル 24H', W0], ['NOVA NOODLE', 'ラーメン', '#ffd27a'], ['CHISPAZ', 'ENERGÍA +', '#8cf4ff'], ['SÚPER', 'HOY 50%', W0], ['OJIVEX-9', 'CLÍNICA 瞳', '#8cf4ff'], ['ZAPTRO', 'スニーカー', W0], ['PLAYORA', 'VACACIONES', '#ffe6a8'], ['CALMA', '静けさ', '#a8f4ff'], ['LABIOS', 'BAR 唇', W0], ['RADIO 88', 'NOCHE LIVE', '#ffd86a'], ['SAKE BAR', '酒場', W0], ['NOCTELO', 'ホテル', '#8cf4ff'], ['TRONZO', 'MOTORS', W0], ['TIGRE', '虎 BOX', '#ffc880'], ['KOI PAY', '鯉 NET', '#8cf4ff'], ['FIESTA', 'NIGHT MARKET', '#ffe07a']];
  art.forEach((fn, i) => {
    const w = 256, h = 384, ox = (i % 4) * w * 2, oy = Math.floor(i / 4) * h * 2; x.save(); x.translate(ox, oy); x.scale(2, 2); x.beginPath(); x.rect(0, 0, w, h); x.clip();
    fn(w, h);
    /* lift the blacks into the ad's own colour so the picture runs edge to edge */
    x.globalCompositeOperation = 'screen'; x.fillStyle = WASH[i]; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
    /* the copy sits on the picture, on a soft fall into its colour */
    x.fillStyle = lg(0, h * .72, 0, h, 'rgba(4,3,6,0)', 'rgba(4,3,6,.46)', 'rgba(4,3,6,.62)'); x.fillRect(0, h * .72, w, h * .28);
    const [t, sub, tc] = words[i]; x.fillStyle = tc; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.shadowColor = 'rgba(0,0,0,.9)'; x.shadowBlur = 4; x.font = '400 ' + (t.length > 8 ? 25 : t.length > 6 ? 31 : 38) + 'px ' + FONT_DISP; x.fillText(t, 12, h * .90); x.shadowBlur = 0; x.font = '800 15px ' + FONT_JP; x.globalAlpha = .82; x.fillText(sub, 13, h * .96); x.globalAlpha = 1;
    /* film grain so flat gradients do not band */
    for (let k = 0; k < 1500; k++) { x.fillStyle = R() < .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; x.fillRect(R() * w, R() * h, 1, 1); }
    x.restore();
  });
  /* two wide pictures along the bottom of the atlas, made to bend around a corner: the name twice, the subject over the bend */
  const capsule = (cx, cy, a, k) => { x.save(); x.translate(cx, cy); x.rotate(a); x.scale(k, k); x.fillStyle = lg(0, -42, 0, 42, '#eafcff', '#30d8ec', '#0a5a6a'); x.beginPath(); x.arc(-44, 0, 40, Math.PI / 2, -Math.PI / 2); x.lineTo(0, -40); x.lineTo(0, 40); x.fill(); x.fillStyle = lg(0, -42, 0, 42, '#fff', '#e8e4dc', '#6a6a72'); x.beginPath(); x.arc(44, 0, 40, -Math.PI / 2, Math.PI / 2); x.lineTo(0, 40); x.lineTo(0, -40); x.fill(); x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.ellipse(-20, -22, 40, 5, 0, 0, TAU); x.fill(); x.restore(); };
  const wide = (oy, fn) => { x.save(); x.translate(0, oy); x.scale(2, 2); x.beginPath(); x.rect(0, 0, 1024, 256); x.clip(); fn(1024, 256); for (let k = 0; k < 2600; k++) { x.fillStyle = R() < .5 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.05)'; x.fillRect(R() * 1024, R() * 256, 1, 1); } x.restore(); };
  wide(3072, (w, h) => { x.fillStyle = lg(0, 0, w, 0, '#0d7ae0', '#14c4e4', '#1a7cf0', '#1438c8', '#0d7ae0'); x.fillRect(0, 0, w, h); add(() => { disc(512, 128, 300, 'rgba(180,250,255,.5)'); disc(120, 40, 200, 'rgba(120,200,255,.35)'); disc(900, 220, 220, 'rgba(120,120,255,.35)'); }); x.strokeStyle = 'rgba(255,255,255,.2)'; x.lineWidth = 2; for (let j = 0; j < 5; j++) { x.beginPath(); for (let i = 0; i <= 40; i++) x.lineTo(i * 26, 40 + j * 46 + Math.sin(i * .55 + j) * 12); x.stroke(); } capsule(512, 104, -.5, 1.3); capsule(440, 184, .45, .7); capsule(596, 196, 1.2, .62); x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,30,90,.7)'; x.shadowBlur = 10; x.textBaseline = 'middle'; x.textAlign = 'left'; x.font = '900 92px ' + FONT_DISP; x.fillText('CALMA', 24, 112); x.textAlign = 'right'; x.fillText('CALMA', w - 24, 112); x.shadowBlur = 0; x.font = '800 34px ' + FONT_JP; x.textAlign = 'left'; x.fillText('静けさ  24H', 28, 192); x.textAlign = 'right'; x.fillText('静けさ  24H', w - 28, 192); });
  wide(3584, (w, h) => { x.fillStyle = lg(0, 0, w, 0, '#ff7a1c', '#ffd21c', '#ff9c1c', '#ff3a4a', '#ff7a1c'); x.fillRect(0, 0, w, h); add(() => disc(512, 128, 280, 'rgba(255,250,190,.7)')); x.fillStyle = 'rgba(255,255,255,.2)'; for (let i = 0; i < 12; i++) { poly([512, 128], [512 + Math.cos(i / 12 * TAU) * 700, 128 + Math.sin(i / 12 * TAU) * 700], [512 + Math.cos((i + .4) / 12 * TAU) * 700, 128 + Math.sin((i + .4) / 12 * TAU) * 700]); x.fill(); } x.fillStyle = lg(452, 0, 572, 0, '#06161c', '#0fa8bc', '#d8fcff', '#18c4d8', '#031014'); x.fillRect(456, 26, 112, 204); x.fillStyle = lg(456, 0, 568, 0, '#3a3e44', '#d8dce0', '#fff', '#8a8e94', '#25282c'); x.beginPath(); x.ellipse(512, 26, 56, 10, 0, 0, TAU); x.fill(); x.fillStyle = '#ffe94a'; poly([522, 56], [482, 134], [508, 134], [492, 206], [546, 112], [516, 112]); x.fill(); x.fillStyle = '#14080a'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.font = '900 80px ' + FONT_DISP; x.fillText('CHISPAZ', 24, 108); x.textAlign = 'right'; x.fillText('CHISPAZ', w - 24, 108); x.font = '800 32px ' + FONT_JP; x.textAlign = 'left'; x.fillText('ENERGÍA +', 28, 190); x.textAlign = 'right'; x.fillText('ENERGÍA +', w - 28, 190); });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = 8; return tex;
}

/* ---------- light pool map: top-down colours poured on streets, 1024^2 over +-700 m ---------- */
const POOL_R = 700;
const POOLS = [];
function pool(x, z, r, c, a = 1) { POOLS.push({ x, z, r, c: typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : c, a }); }
function drawPools() {
  const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, S, S); x.globalCompositeOperation = 'lighter';
  for (const p of POOLS) {
    const cx = (p.x + POOL_R) / (2 * POOL_R) * S, cy = (p.z + POOL_R) / (2 * POOL_R) * S, r = p.r / (2 * POOL_R) * S;
    const G = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(r, 1)); const h = p.c; const a1 = p.a;
    const hexA = (a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
    /* hard banded falloff: light as shapes */
    G.addColorStop(0, hexA(.9 * a1)); G.addColorStop(.42, hexA(.9 * a1)); G.addColorStop(.44, hexA(.5 * a1)); G.addColorStop(.72, hexA(.5 * a1)); G.addColorStop(.74, hexA(.22 * a1)); G.addColorStop(1, hexA(0));
    x.fillStyle = G; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.flipY = false; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; return t;
}

function koiTexture() {
  const W = 1024, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.translate(0, 256); x.lineJoin = 'round'; x.lineCap = 'round';
  const body = () => { x.beginPath(); x.moveTo(972, 0); x.bezierCurveTo(955, -52, 880, -84, 760, -88); x.bezierCurveTo(600, -90, 360, -52, 190, -14); x.lineTo(190, 14); x.bezierCurveTo(360, 52, 600, 90, 760, 88); x.bezierCurveTo(880, 84, 955, 52, 972, 0); x.closePath(); };
  const tail = () => { x.beginPath(); x.moveTo(214, -16); x.bezierCurveTo(130, -40, 70, -110, 14, -170); x.bezierCurveTo(50, -92, 66, -40, 96, 0); x.bezierCurveTo(66, 40, 50, 92, 14, 170); x.bezierCurveTo(70, 110, 130, 40, 214, 16); x.closePath(); };
  const fin = (px, sgn, L0, sw) => { x.beginPath(); x.moveTo(px + 40, sgn * 70); x.bezierCurveTo(px + 60, sgn * (70 + L0 * .7), px - 40, sgn * (70 + L0), px - sw, sgn * (64 + L0 * .92)); x.bezierCurveTo(px - sw * .7, sgn * (64 + L0 * .5), px - 60, sgn * 74, px - 40, sgn * 62); x.closePath(); };
  /* fins and tail first: dim fill, fine ribs, bright edge */
  const finSet = op => { for (const [px, sgn, L0, sw] of [[740, 1, 158, 150], [740, -1, 158, 150], [470, 1, 64, 80], [470, -1, 64, 80]]) { fin(px, sgn, L0, sw); op(); } };
  x.fillStyle = 'rgb(255,70,56)'; tail(); x.fill();
  x.fillStyle = 'rgb(62,190,205)'; finSet(() => x.fill());
  x.strokeStyle = 'rgba(190,250,255,.55)'; x.lineWidth = 3;
  for (const [px, sgn, L0, sw] of [[740, 1, 158, 150], [740, -1, 158, 150], [470, 1, 64, 80], [470, -1, 64, 80]]) for (let i = 0; i < 6; i++) { const k = i / 5; x.beginPath(); x.moveTo(px + 20 - k * 60, sgn * 68); x.lineTo(px + 30 - k * sw * 1.05, sgn * (64 + L0 * (.98 - .2 * Math.abs(k - .5)))); x.stroke(); }
  x.strokeStyle = 'rgba(255,190,170,.55)'; for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(190, i * 3); x.quadraticCurveTo(120, i * 16, 52, i * 42); x.stroke(); }
  /* the body: pale fill, big red patches like a real koi */
  x.save(); body(); x.clip();
  const G = x.createLinearGradient(0, -90, 0, 90); G.addColorStop(0, 'rgb(70,170,190)'); G.addColorStop(.5, 'rgb(125,212,222)'); G.addColorStop(1, 'rgb(70,170,190)'); x.fillStyle = G; x.fillRect(0, -128, W, 256);
  x.fillStyle = 'rgb(255,52,36)'; for (const [cx, cy, rx, ry, a] of [[846, -8, 58, 66, .1], [668, -34, 112, 40, -.14], [590, 34, 74, 30, .2], [438, -8, 92, 30, .06], [300, 7, 54, 16, 0]]) { x.beginPath(); x.ellipse(cx, cy, rx, ry, a, 0, TAU); x.fill(); }
  x.restore();
  /* one bright rim around everything */
  x.shadowColor = '#b8ffff'; x.shadowBlur = 16; x.strokeStyle = '#e8ffff'; x.lineWidth = 8; body(); x.stroke(); tail(); x.stroke(); x.lineWidth = 6; finSet(() => x.stroke()); x.shadowBlur = 0;
  /* eyes and whiskers */
  x.fillStyle = '#fff36a'; for (const s of [-1, 1]) { x.beginPath(); x.arc(902, s * 44, 13, 0, TAU); x.fill(); } x.fillStyle = '#10222a'; for (const s of [-1, 1]) { x.beginPath(); x.arc(906, s * 45, 6, 0, TAU); x.fill(); }
  x.strokeStyle = '#e8ffff'; x.lineWidth = 5; for (const s of [-1, 1]) { x.beginPath(); x.moveTo(958, s * 18); x.quadraticCurveTo(1004, s * 38, 1012, s * 74); x.stroke(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = 4; return tex;
}

/* ---------- world shader: every merged mesh in the city and the shop goes through this ---------- */
const NL = 8;
const WORLD_VS = /* glsl */`
precision highp float;
uniform mat4 modelMatrix, viewMatrix, projectionMatrix;
uniform float uMY;
in vec3 position; in vec4 normal; in vec4 aCol; in vec2 aUv; in vec4 aMat;
out vec3 vW; out vec3 vN; out vec4 vC; out vec2 vU; flat out vec4 vM;
void main(){
  vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; vN=mat3(modelMatrix)*normal.xyz; vC=aCol; vU=aUv; vM=aMat;
#ifdef MIRROR
  w.y = 2.*uMY-w.y;
#endif
  gl_Position = projectionMatrix*viewMatrix*w;
}`;

const NOISE_GLSL = /* glsl */`
float h21(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float h11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
`;

/* ---------- the mountain and its ski valley ---------- */
/* The massif north across the water, and a valley carved into its front: a flat floor rising gently from the shore to a
   head wall under the peak, the village and the chalet on the floor, a gondola up the west shoulder to a top station, a
   chairlift up the east side, pistes down to the village. MTN shapes the massif; mtnH is the ground (the mesh sits 2 below) */
const MTN = { cx: 180, cz: -1120, W: 1700, D: 780 };
function mtnRaw(x, z) {
  const { cx, cz, W, D } = MTN, u = (x - cx) / W * 2, v = (z - cz) / D * 2, r = Math.hypot(u, v * .85), b = Math.max(0, 1 - r);
  let h = Math.pow(b, 1.1) * 620; h += 60 * Math.sin(x * .011 + 1) * Math.sin(z * .013) * b; h += 26 * Math.sin(x * .031 + z * .02) * b;
  const rg = (f, a) => (1 - Math.abs(Math.sin(x * f + z * f * .6 + 1.3))) * a; h += (rg(.021, 62) + rg(.057, 22) + rg(.13, 8) - 42) * Math.min(1, b * 2.2);
  return Math.max(h, 0);
}
const valleyX = z => 300 + Math.sin((z + 700) * .006) * 14;
function mtnH(x, z) {
  const h = mtnRaw(x, z), d = Math.max(0, -690 - z), fl = 5 + d * .13, hw = 74 - d * .05;
  const w = (1 - sstep(hw, hw + 150, Math.abs(x - valleyX(z)))) * sstep(-1090, -1000, z);
  return h > fl ? h + (fl - h) * w : h;
}
const SKI = (() => {
  const g = (x, z) => mtnH(x, z) - 2;
  /* the chalet on the valley floor, its glass end (+X) looking across at the chairlift and the east runs; its floor just above the highest ground under it */
  const ch = { x: 250, z: -955 }; ch.y = +(Math.max(...[[-8, -7], [9, -7], [-8, 7], [9, 7]].map(([a, b]) => g(ch.x + a, ch.z + b))) + .95).toFixed(2);
  return {
    ch, vil: { x: 305, z: -850 },
    gBase: [318, -905], gTop: [190, -1060],
    chair: [[352, -900], [470, -990]],
    /* the runs, as center lines: off the top station down the west wall and the head wall, off the chair down the east side */
    pistes: [
      [[190, -1050], [180, -1000], [195, -950], [225, -905], [265, -878]],
      [[205, -1055], [250, -1040], [285, -1010], [300, -975], [310, -935]],
      [[470, -990], [440, -976], [405, -963], [372, -952]],
      [[470, -990], [495, -945], [480, -905], [440, -880], [395, -868], [352, -862]],
    ],
  };
})();
const PISTE_SEGS = SKI.pistes.flatMap(l => l.slice(1).map((b, i) => [l[i], b]));
function skiPiste(x, z) { let d = 1e4; for (const [a, b] of PISTE_SEGS) { const bx = b[0] - a[0], bz = b[1] - a[1], t = clamp(((x - a[0]) * bx + (z - a[1]) * bz) / (bx * bx + bz * bz)); d = Math.min(d, Math.hypot(x - a[0] - bx * t, z - a[1] - bz * t)); } return 1 - sstep(9, 14, d); }
const glv = (v) => `vec2(${(+v[0]).toFixed(1)},${(+v[1]).toFixed(1)})`;
const PISTE_GLSL = `float segD(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
float pisteD(vec2 p){ float d=1e4; ${PISTE_SEGS.map(([a, b]) => `d=min(d,segD(p,${glv(a)},${glv(b)}));`).join(' ')} return d; }`;

const WORLD_FS = /* glsl */`
precision highp float; precision highp int; precision highp sampler2DArray;
in vec3 vW; in vec3 vN; in vec4 vC; in vec2 vU; flat in vec4 vM;
layout(location=0) out vec4 O;
uniform vec3 cameraPosition;
uniform float uTime, uMY, uRoomMode, uShadowOn, uShadowBias, uReflOn, uRainWin;
uniform vec2 uRes;
uniform sampler2D uSigns, uAds, uPool, uShadow, uRefl, uMirror; uniform float uClipZ;
uniform sampler2DArray uTiles;
uniform mat4 uShadowM;
uniform vec3 uLP[${NL}]; uniform vec4 uLC[${NL}];
uniform vec3 uMoon, uMoonC, uAmbHi, uAmbLo, uAmbSide, uFogHi, uFogLo, uRim;
uniform float uFogD, uFogH, uPoolR, uPoolK;
uniform vec4 uSky;   /* x daylight (0 is the night as painted), y unused, z wet, w snow lying */
uniform vec3 uSkyH, uSkyZ;   /* the sky now: horizon and overhead, for what glass reflects by day */
uniform vec4 uTill;
uniform vec4 uGobo;   /* window light in the shop: x0, x1 (z range), y0, y1 */
uniform vec3 uGoboD, uGoboC; uniform float uGoboX;
${NOISE_GLSL}
${PISTE_GLSL}
float band(float v){ /* three flat tones with a thin soft edge */
  return .34*smoothstep(.035,.055,v)+.34*smoothstep(.26,.285,v)+.32*smoothstep(.56,.59,v);
}
float shadowAt(vec3 P, vec3 N){
#ifdef MIRROR
  return 1.;
#else
  if(uShadowOn<.5) return 1.;
  vec4 s=uShadowM*vec4(P+N*uShadowBias*4.5,1.); s.xyz/=s.w; s.xyz=s.xyz*.5+.5;
  if(s.x<0.||s.x>1.||s.y<0.||s.y>1.||s.z>1.) return 1.;
  float rf=s.z-uShadowBias*.01;
  if(uRoomMode>.5){ const float tx=.00049; return (step(rf,texture(uShadow,s.xy+tx*vec2(-.8,-.3)).r)+step(rf,texture(uShadow,s.xy+tx*vec2(.3,-.8)).r)+step(rf,texture(uShadow,s.xy+tx*vec2(.8,.3)).r)+step(rf,texture(uShadow,s.xy+tx*vec2(-.3,.8)).r))*.25; }
  return step(rf,texture(uShadow,s.xy).r);
#endif
}
/* the shadow and the light at this pixel, worked out once in main for the kinds that are lit: written inline at every use, the
   Direct3D shader compiler on an Intel laptop chip overflowed its stack on this shader and took the browser's GPU process down */
float gSh=1.; vec3 gL=vec3(0.);
vec3 lightAll(vec3 P, vec3 N, vec3 V, float gl, out float keyL){
  vec3 amb = mix(uAmbLo,uAmbHi,N.y*.5+.5);
  amb += uAmbSide*max(0.,dot(N,vec3(.33,.24,.91)));
  float sh=gSh;
  float m=dot(N,uMoon);
  vec3 c=amb + uMoonC*band(max(m,0.)*.85)*sh;
  keyL=0.;
  for(int i=0;i<${NL};i++){
    vec4 lc=uLC[i]; if(lc.a<=0.) continue;
    vec3 d=uLP[i]-P; float r2=dot(d,d); float R=abs(lc.a); float a=1.-r2/(R*R); if(a<=0.) continue; a*=a;
    float nl=dot(N,d)/sqrt(r2+1e-4); nl=nl*.75+.25; if(nl<=0.) continue;
    float b=band(a*nl);
    if(i==0) b*=mix(.28,1.,sh);
    c+=lc.rgb*b;
  }
#ifndef MIRROR
  /* window light as a hard shape: project along the street light onto the glass plane */
  if(uRoomMode>.5){
    float tg=(uGoboX-P.x)/uGoboD.x;
    if(tg>0.){
      vec3 q=P+uGoboD*tg;
      vec2 wv=vec2((q.z-uGobo.x)/(uGobo.y-uGobo.x),(q.y-uGobo.z)/(uGobo.w-uGobo.z));
      if(wv.x>0.&&wv.x<1.&&wv.y>0.&&wv.y<1.){
        float mull=step(.035,abs(fract(wv.x*4.)-.5)*2.)*step(.03,abs(fract(wv.y*2.)-.5)*2.)*step(.08,abs(fract(wv.x*4.)-.5)*2.+.2);
        float rain=smoothstep(.2,.55,texture(uTiles,vec3(wv.x*2.,wv.y*.5+uTime*.05,9.)).r);
        float side=max(dot(N,-uGoboD),0.);
        /* by day the window throws daylight (a room keeps its colour in uSkyH); its rain streaks only while it rains */
        c+=mix(mix(vec3(.04,.5,.66),vec3(.62,.07,.4),smoothstep(.3,.72,wv.x))*(uGoboC.b*1.5),uSkyH,uSky.x)*mull*mix(1.,.55+.45*rain,uSky.z)*smoothstep(0.,.2,side);
      }
    }
  }
#endif
  float rim=1.+dot(V,N);
  c+=uRim*smoothstep(.72,.76,rim)*smoothstep(-.3,.3,m+.3)*.55;
  return c;
}
vec3 poolAt(vec2 xz){ return texture(uPool,(xz+uPoolR)/(2.*uPoolR)).rgb; }
vec3 fogIt(vec3 c, vec3 P, float e){
  vec3 D=P-cameraPosition; float d=length(D);
  if(uFogD<=0.) return c;
  float k=uFogH; float h0=max(cameraPosition.y,0.), dh=D.y;
  float f = abs(dh)>.01 ? (exp(-k*h0)-exp(-k*(h0+dh)))/(k*dh) : exp(-k*h0);
  float a=1.-exp(-uFogD*d*f);
  float low=exp(-max(P.y,0.)*.012);
  /* street haze: nothing up close, a glowing bank seen from a distance */
  float street=exp(-max(P.y,0.)*.03)*(1.-exp(-d*.0017));
  a=1.-(1.-a)*(1.-street*.7);
  vec3 fc=mix(uFogHi,uFogLo,low);
  /* near air is cool, far air is the warm smog */
  fc=mix(fc*mix(vec3(.62,.95,1.3),vec3(.94,.98,1.04),uSky.x),fc,smoothstep(140.,1000.,d));
#ifndef MIRROR
  fc+=textureLod(uPool,(P.xz+uPoolR)/(2.*uPoolR),4.5).rgb*uPoolK*(low*1.3+street*1.9)+uFogLo*street*.45;
#endif
  fc=min(fc,mix(vec3(.5,.31,.28),vec3(1.),uSky.x));
  vec3 outC=mix(c,fc,clamp(a*(1.-e*.42),0.,1.));
  /* each row of blocks back from the water sits in its own step of coloured air */
  float s1=smoothstep(160.,138.,P.z), s2=smoothstep(-16.,-42.,P.z), s3=smoothstep(-158.,-184.,P.z), s4=smoothstep(-296.,-326.,P.z);
  float hz=s1*.08+s2*.15+s3*.17+s4*.2+.3*smoothstep(900.,1500.,d);
  vec3 hc=vec3(.46,.17,.21); hc=mix(hc,vec3(.1,.3,.37),s2); hc=mix(hc,vec3(.56,.2,.27),s3); hc=mix(hc,vec3(.46,.2,.33),s4);
  /* by day the steps of coloured air are plain haze */
  hc=mix(hc,uFogLo,uSky.x);
  hz*=smoothstep(120.,360.,d)*exp(-max(P.y,0.)*.0024)*(1.-e*.5)*(1.-uSky.x*.35);
  return mix(outC,hc,hz);
}
/* a room behind the glass: trace a box per window, with a furniture layer */
vec3 interior(vec2 p, vec3 v, float h, vec3 tint){
  float D=.9+h*1.1;
  vec3 ro=vec3(p,0.);
  float tx=(sign(v.x)-ro.x)/(abs(v.x)<1e-3?1e-3:v.x), ty=(sign(v.y)-ro.y)/(abs(v.y)<1e-3?1e-3:v.y), tz=(-2.*D)/min(v.z,-1e-3);
  float t=min(tx,min(ty,tz)); vec3 q=ro+v*t;
  vec3 wall=mix(tint*.72,tint*vec3(.62,.42,.5),step(.55,fract(h*7.3)));
  vec3 c;
  if(t==tz){
    c=wall;
    /* picture, shelf or screen on the back wall */
    float f=fract(h*13.7);
    if(f<.33){ c=mix(c,vec3(.14,.09,.16),step(abs(q.x-(fract(h*3.)-.5)),.4)*step(abs(q.y-.1),.34)); }
    else if(f<.6){ c=mix(c,tint*.42,step(fract((q.y+1.)*2.2),.14)); c=mix(c,vec3(.3,.8,.85),step(abs(q.x+.4),.25)*step(abs(q.y-.1),.18)*step(.82,fract(h*91.))); }
    c*=.85+.3*q.y*.5;
  } else if(t==ty){
    c = v.y>0. ? tint*1.12 : tint*vec3(.34,.24,.26);
    if(v.y>0.) c=mix(c,tint*1.25+.04,smoothstep(.34,.28,length(vec2(q.x,(q.z+D)*.6))));
  } else c=wall*.74;
  /* furniture cut-out half way in */
  float tf=(-D)/min(v.z,-1e-3);
  if(tf<t){
    vec3 s=ro+v*tf; float f=fract(h*29.1); vec3 dk=tint*vec3(.16,.12,.18)+vec3(.02,.01,.04);
    float m=0.;
    if(f<.3){ m=step(s.y,-.52)*step(abs(s.x+.1),.8); m=max(m,step(s.y,-.2)*step(abs(s.x+.72),.12)); }
    else if(f<.5){ m=step(length(vec2(s.x-.25,s.y+.1)),.17)+step(abs(s.x-.25),.2)*step(s.y,-.2); }
    else if(f<.7){ m=step(s.y,-.2)*step(abs(s.x-.5),.3); m=max(m,step(abs(s.x-.5),.18)*step(abs(s.y-.0),.13)*.7); }
    if(m>0.) c=mix(c,dk,clamp(m,0.,1.));
  }
  /* curtains close to the glass */
  float g=fract(h*51.2);
  if(g<.4){ float cw=.18+.4*fract(h*17.); float sx=p.x+v.x*.03; float a=step(1.-cw,abs(sx)); c=mix(c,tint*.86*(.82+.18*step(.5,fract(sx*7.))),a); }
  else if(g<.55){ float bl=fract(h*23.)*1.2; float sy=p.y+v.y*.03; if(sy>1.-bl) c=mix(tint*.7,tint*.5,step(.5,fract(sy*7.))); }
  return c;
}
vec3 litTint(float h){
  if(h<.66) return mix(vec3(1.,.8,.5),vec3(1.,.91,.7),h/.66);
  if(h<.82) return vec3(1.,.62,.3);
  if(h<.9) return vec3(.62,.9,1.);
  if(h<.96) return vec3(1.,.55,.72);
  return vec3(.76,.68,1.);
}
const vec4 ST[8]=vec4[8](
  vec4(3.3,3.8,.86,.74), /* 0 black glass curtain wall */
  vec4(3.6,4.2,.96,.42), /* 1 ribbon */
  vec4(4.6,3.5,.44,.52), /* 2 punched concrete */
  vec4(5.4,4.2,.62,.5),  /* 3 kitsch pills */
  vec4(3.4,3.1,.52,.6),  /* 4 megablock */
  vec4(4.2,5.2,.56,.7),  /* 5 luxe, deep and tall */
  vec4(6.,8.,.34,.6),    /* 6 stone, arched */
  vec4(4.,4.,.7,.6));    /* 7 far */
vec3 facade(vec3 P, vec3 N, vec3 V, vec3 base, float lit, float seed, int style, out float em){
  vec4 st=ST[style];
  /* by day most rooms are dark against the light outside */
  lit*=1.-uSky.x*.72;
  vec2 q=vU/st.xy; vec2 c=floor(q); vec2 f=fract(q)-.5;
  float fw=max(length(dFdx(q)),length(dFdy(q)));
  float gr=texture(uTiles,vec3(vU*.021+seed,8.)).r;
  vec3 L=gL;
  vec3 w0=base*(style==6?1.:mix(1.,gr,.75));
  /* weather on the wall, painted as flat shapes: rain streaks, repainted patches, panel seams, drips under sills */
  float gk=1.-smoothstep(.1,.36,fw);
  if(gk>0.){
    float s1=texture(uTiles,vec3(vU.x*.037+seed*3.1,vU.y*.0042+seed,9.)).r, s2=texture(uTiles,vec3(vU.x*.11+seed*1.7,vU.y*.009,9.)).r;
    float streak=smoothstep(.55,.575,s1*.7+s2*.42);
    float rep=smoothstep(.6,.622,texture(uTiles,vec3(vU*.0125+seed*5.3,9.)).r);
    vec3 g=w0*mix(1.,.7,streak)*mix(1.,.82,rep)*(.92+.16*h21(vec2(c.y*.61,seed*7.)));
    if(fw<.16){
      vec2 pf=abs(fract(vU/vec2(st.x*3.,st.y*2.))-.5); float pw=fw*.7+.004;
      g*=1.-.24*max(smoothstep(.5-pw,.5,pf.x),smoothstep(.5-pw,.5,pf.y));
      float hd=h21(c+seed*3.); float drip=step(hd,.42)*(1.-smoothstep(.025,.05,abs(f.x-(hd-.21))))*step(f.y,-st.w*.5);
      g*=1.-.34*drip;
    }
    w0=mix(w0,g,gk);
  }
  /* floor slab lines and pilasters */
  float slab=step(.46,abs(f.y)); float pil=step(.46,abs(f.x));
  if(fw<.5){ if(style==2||style==4||style==6) w0*=1.-.28*slab; if(style==0) w0*=1.-.16*max(slab,pil); }
  vec3 wall=w0*L;
  vec3 Rr=reflect(V,N);
  float upR=clamp(Rr.y*1.5+.12,0.,1.);
  vec3 skyRefl=mix(mix(vec3(.32,.11,.17),vec3(.035,.11,.15),upR),mix(uSkyH,uSkyZ,upR)*.82,uSky.x);
  if(style<2){ wall+=skyRefl*.55*(.75+.25*gr); }
  vec3 pool=poolAt(P.xz)*uPoolK; wall+=w0*pool*exp(-max(P.y,0.)*.017)*1.9;
  /* the street lights every wall from under */
  wall+=(w0+.03)*vec3(.5,.3,.34)*exp(-max(P.y,0.)*.011)*.55*(1.-uSky.x*.92);
  /* by day the street is lit by the sky bouncing between the walls instead */
  wall+=(w0+.03)*uAmbLo*exp(-max(P.y,0.)*.008)*.9*uSky.x;
  float hc=h21(c+seed*57.);
  float floorDark=step(h21(vec2(c.y*.37,seed*91.)),.16);
  float blocks=h21(floor(c/vec2(5.,3.))+seed*13.);
  float lf=lit*(1.-floorDark*.8)*(.55+.9*blocks);
  float on=step(hc,lf);
  float hT=fract(hc*97.3);
  em=0.;
  /* past mid distance: a fine grid of small windows, mostly dim, lit in clusters, a few whole floors */
  float farK=smoothstep(.026,.06,fw); vec3 farC=vec3(0.);
  if(farK>0.){
    int T = style==7? int(fract(seed*3.7)*3.99) : style==1? 1 : style==0? (fract(seed*5.3)<.5?0:3) : style==5? 3 : 2;
    float wxF= T==0?.38 : T==1?.47 : T==2?.3 : .36;
    float wyF= T==0?.36 : T==1?.25 : T==2?.4 : .3;
    vec2 qf=q*vec2(2.,1.); vec2 cf=floor(qf), ff=fract(qf)-.5;
    float fx=length(vec2(dFdx(qf.x),dFdy(qf.x))), fy=length(vec2(dFdx(qf.y),dFdy(qf.y)));
    /* vertical piers run the full height on two of the four types */
    float pier= T==2? step(2.,mod(cf.x,3.)) : T==3? step(3.,mod(cf.x+1.,4.)) : T==0? step(7.,mod(cf.x,8.)) : 0.;
    float hw=h21(cf+seed*57.), hf=h21(vec2(cf.y*.37+seed*91.,seed*17.));
    float bl=h21(floor(cf/vec2(11.,5.))+seed*13.);
    float pp=lit*(.2+2.7*bl*bl);
    if(hf<.032) pp=.84; else if(hf>.86) pp*=.08;
    float isOn=step(hw,pp)*(1.-pier);
    float b2=fract(hw*91.7); float bright=.2+.42*b2+.8*b2*b2*b2*b2*b2*b2;
    float cx=clamp((wxF-abs(ff.x))/max(fx,.001)+.5,0.,1.), cy=clamp((wyF-abs(ff.y))/max(fy,.001)+.5,0.,1.);
    float win=cx*cy*(1.-pier);
    float xb=smoothstep(.5,1.15,fx), yb=smoothstep(.5,1.15,fy);
    /* under a pixel: rows, then soft patches */
    float rowM=lit*(.25+1.2*h21(vec2(cf.y*.71,seed*31.)))*(hf<.032?2.2:hf>.86?.1:1.)*2.*wxF;
    float patchM=lit*(.25+1.25*texture(uTiles,vec3(q.x*.031+seed*3.7,q.y*.012+seed*9.1,9.)).r)*4.*wxF*wyF*.72;
    float low=(1.-isOn)*step(fract(hw*37.1),.62)*.07*(.6+.8*fract(hw*11.3));
    float val=mix((isOn*bright+low)*win,rowM*.62*cy,xb); val=mix(val,patchM,yb);
    float cover=mix(mix(win,cy*2.*wxF,xb),4.*wxF*wyF,yb);
    vec3 t=mix(litTint(fract(hw*17.3)),litTint(h21(floor(cf/vec2(11.,5.))+seed*17.)),max(xb,yb));
    /* the wall is never pure black, glass keeps the sky */
    float piers= T==2?1.15:T==3?1.05:1.;
    vec3 wallF=wall*piers;
    vec3 glassF=mix(base*.2,skyRefl,T<2?.62:.34);
    farC=mix(wallF,glassF,cover*.92)+t*val*1.08;
    if(farK>=1.){ em=min(val,1.); return farC; }
  }
  float wx=st.z*.5, wy=st.w*.5, aa=fw*.9+.004;
  /* old blocks vary window by window, floor by floor */
  float hRow=h21(vec2(c.y*.83,seed*23.));
  if(style==3||style==4||style==2){ wx*=mix(.82,1.12,hRow); wy*=mix(1.06,.86,fract(hRow*7.)); }
  float m;
  if(style==3){ vec2 d=abs(f)-vec2(wx-.05,wy-.05); m=smoothstep(.05+aa,.05-aa,length(max(d,0.))+min(max(d.x,d.y),0.)); }
  else if(style==6){ float ty=max(f.y-(wy-wx),0.); float dd=length(vec2(f.x,ty)); m=smoothstep(wx+aa,wx-aa,dd)*smoothstep(-wy-aa,-wy+aa,f.y); }
  else m=smoothstep(wx+aa,wx-aa,abs(f.x))*smoothstep(wy+aa,wy-aa,abs(f.y));
  if(style==1){ m*=smoothstep(.0,.05+aa,abs(f.x)-.0)+.0; }
  vec3 R=Rr;
  vec3 skyR=mix(uFogLo*.45,vec3(.018,.026,.05),clamp(R.y*1.6+.2,0.,1.));
  skyR=mix(skyR,mix(uSkyH,uSkyZ,clamp(R.y*1.6+.2,0.,1.))*.7,uSky.x);
  vec3 poolR=pool*exp(-max(P.y,0.)*.02)*1.6;
  vec3 glass=mix(base*.16,skyR,.72)+poolR*.28;
  float nearK=0.;
#ifndef MIRROR
  /* a room behind the glass only once a window is big enough to read as a room */
  nearK=1.-smoothstep(.028,.05,fw);
#endif
  vec3 wcol=glass;
  if(on>.5){
    vec3 t=litTint(hT);
    wcol=t*(.34+.74*fract(hc*53.1));
#ifndef MIRROR
    /* too small for a room: ceiling light falling off, then blinds, curtains or furniture */
    { vec2 pw=f/vec2(max(wx,.01),max(wy,.01)); float sh=fract(hc*7.7);
      wcol*=mix(.58,1.14,smoothstep(-1.,.7,pw.y));
      if(sh<.28) wcol=mix(wcol,t*.24,step(pw.y,-.3-.3*fract(hc*19.))*step(abs(pw.x-fract(hc*31.)+.5),.6));
      else if(sh<.52) wcol=mix(wcol,t*.42,step(.5+.3*fract(hc*23.),abs(pw.x)));
      else if(sh<.72) wcol*=.7+.3*step(.42,fract(pw.y*2.5)); }
    if(nearK>.01){
      vec3 T=normalize(cross(vec3(0.,1.,0.),N));
      vec3 v=vec3(dot(V,T),V.y,dot(V,N)); v.xy*=st.yx/st.xy*vec2(st.x/st.y,1.)*1.0;
      vec2 pi=vec2(f.x/max(wx,.01),f.y/max(wy,.01));
      vec3 ic=interior(pi,normalize(v),hc*.73+.11,t);
      wcol=mix(wcol,ic,nearK);
    }
#endif
    em=1.;
  } else {
    /* shutters and blinds on the older blocks */
    if((style==2||style==3||style==4)&&hc>.72){ float sb=step(.5,fract(f.y*11.)); wcol=mix(wcol,w0*L*(.62+.2*sb)+poolR*.1,.92); }
#ifndef MIRROR
    /* dark rooms still have depth and blinds, with the street lying on the glass */
    else if(nearK>.01){
      vec3 T=normalize(cross(vec3(0.,1.,0.),N));
      vec3 v=vec3(dot(V,T),V.y,dot(V,N));
      vec2 pi=vec2(f.x/max(wx,.01),f.y/max(wy,.01));
      vec3 ic=interior(pi,normalize(v),hc*.73+.11,vec3(.11,.085,.115)*(.7+.7*fract(hc*31.))+poolR*.08);
      wcol=mix(wcol,ic+glass*.42,nearK);
    }
#endif
  }
  em*=m;
  /* sill and frame catch light */
  vec3 nearC=mix(wall,wcol,m);
#ifndef MIRROR
  if(nearK>.01){
    vec3 T=normalize(cross(vec3(0.,1.,0.),N));
    vec2 sh=vec2(dot(V,T),V.y)/max(-dot(V,N),.22)*.085; vec2 g=f+sh;
    float mi=(1.-smoothstep(wx-.03-aa,wx-.03+aa,abs(g.x)))*(1.-smoothstep(wy-.03-aa,wy-.03+aa,abs(g.y)));
    vec3 rev=wall*.34+w0*.012;
    vec3 inC=mix(rev,wcol,mi);
    if(style!=3&&style!=6) inC=mix(inC,rev*.7,(1.-smoothstep(.014,.02+aa,abs(g.x)))*mi);
    float sl=(1.-smoothstep(wx+.02,wx+.03,abs(f.x)))*smoothstep(-wy-.07,-wy-.06,f.y)*(1.-smoothstep(-wy-.001,-wy,f.y));
    nearC=mix(nearC,mix(mix(wall,wall*1.7+w0*.02,sl),inC,m),nearK);
  }
#endif
  return farK>0.? mix(nearC,farC,farK) : nearC;
}
void main(){
  int kind=int(vM.x)&15; int layer=int(vM.x)>>4; float id=vM.y, em0=vM.z/255., seed=vM.w/255.;
  vec3 P=vW; vec3 N=normalize(vN); vec3 Vd=P-cameraPosition; vec3 V=normalize(Vd);
#ifdef MIRROR
  if(P.y<uMY-.05) discard;
#endif
#ifdef ROOMMIR
  if(P.z>uClipZ) discard;
#endif
  if(!(kind==4||kind==5||kind==6||kind==1||kind==7||kind==10||kind==11||kind==8||kind==12)){ float kL; gSh=shadowAt(P,N); gL=lightAll(P,N,V,0.,kL); }
  vec3 alb=vC.rgb; vec3 col; float e=0.;
  if(uRoomMode<.5&&kind==0&&em0<.01) alb=mix(vec3(dot(alb,vec3(.33))),alb,.62);
  if(kind==2){ /* building fronts */
    int style=int(vC.a*255.+.5)&7;
    col=facade(P,N,V,alb,em0,seed,style,e);
    id=id;
  } else if(kind==4){ /* neon tube */
    float nd=clamp(-dot(V,N),0.,1.);
    float fl=1.;
    if(seed>.82){ float t=uTime*(1.+seed*2.)+seed*40.; fl=.72+.28*step(.2,fract(sin(floor(t*3.))*43.7)); }
    col=mix(alb,vec3(1.,.97,.9),smoothstep(.45,.95,nd)*.82)*(1.05)*fl; e=1.; id=0.;
    col*=1.-uSky.x*.38;
  } else if(kind==5){ /* sign face from the atlas */
#ifdef MIRROR
    vec4 s=textureLod(uSigns,vU,3.);
#else
    vec4 s=texture(uSigns,vU);
#endif
    if(s.a<.3) discard;
    float fl=1.;
    if(seed>.9){ fl=.55+.45*smoothstep(-.3,.3,sin(uTime*.9+seed*90.)); }
    else if(seed>.82){ fl=.86+.14*step(.5,fract(sin(floor(uTime*5.+seed*50.))*91.7)); }
    col=s.rgb*alb*em0*1.25*fl; e=max(col.r,max(col.g,col.b))*.9; id=0.;
  } else if(kind==6){ /* animated ad screens */
    float t=uTime/7.+seed*16.;
    float ci=floor(t); float tr=smoothstep(.93,1.,fract(t));
    vec2 uv=vU;
    /* slow pan so screens are never still */
    uv.y=clamp(uv.y+.018*sin(uTime*.7+seed*30.),0.,1.);
    vec2 cc=vec2(mod(ci,4.),3.-mod(floor(ci/4.),4.));
    vec2 suv=(uv+cc)/4.; suv.y=.25+.75*suv.y;
#ifdef MIRROR
    vec3 a=textureLod(uAds,suv,5.).rgb;
#else
    vec3 a=texture(uAds,suv).rgb;
    float nx=ci+1.; vec2 c2=vec2(mod(nx,4.),3.-mod(floor(nx/4.),4.));
    if(tr>0.&&uv.x<tr){ vec2 s2=(uv+c2)/4.; s2.y=.25+.75*s2.y; a=texture(uAds,s2).rgb; }
    /* LED rows, panel seams, a slow sweep; a few modules have died */
    float px=length(dFdx(vU))*90.;
    if(px<.5){ a*=.72+.28*step(.32,fract(vU.y*90.)); a*=.82+.18*step(.28,fract(vU.x*60.)); }
    vec2 mg=floor(vU*vec2(5.,8.)); float hm=h21(mg+floor(seed*97.)*3.1);
    if(hm>.965) a*=.72;
    if(px<.22){ vec2 mf=abs(fract(vU*vec2(5.,8.))-.5); a*=1.-.14*step(.49,max(mf.x,mf.y)); }
    /* a slow bright bar climbs the screen, and the whole picture breathes */
    a+=(a*.9+vec3(.05))*smoothstep(.1,.0,abs(fract(uTime*.09+seed)-vU.y));
    a*=.9+.1*sin(uTime*.8+seed*50.);
    /* glitch moment */
    float g=step(.985,fract(sin(floor(uTime*2.+seed*30.))*43758.5)); if(g>.5) a=a.gbr;
#endif
    col=a*em0*.94; e=.9; id=0.;
  } else if(kind==1){ /* a wide wrap screen: two pictures in turn on the bottom of the ad atlas */
    float t=uTime/13.+seed*3.; float ro=mod(floor(t),2.);
    vec2 su=vec2(vU.x,(vU.y+1.-ro)*.125);
#ifdef MIRROR
    vec3 a=textureLod(uAds,su,4.).rgb;
#else
    vec3 a=texture(uAds,su).rgb;
    float tr=smoothstep(.95,1.,fract(t)); if(tr>0.&&vU.x<tr) a=texture(uAds,vec2(vU.x,(vU.y+ro)*.125)).rgb;
    float px=length(dFdx(vU.y))*128.; if(px<.5) a*=.8+.2*step(.3,fract(vU.y*128.));
    a+=(a*.9+vec3(.05))*smoothstep(.07,.0,abs(fract(uTime*.05+seed)-vU.x));
    a*=.92+.08*sin(uTime*.7+seed*50.);
#endif
    col=a*em0*.94; e=.9; id=0.;
  } else if(kind==7){ /* street glass seen from outside */
    col=mix(vec3(.04,.05,.08),vec3(.2,.23,.27)*(uAmbHi+.2),uSky.x); e=0.;
  } else if(kind==9){ /* brass, painted highlight bands */
    vec3 L=gL;
    vec3 R=reflect(V,N);
    float b=step(.52,fract(R.y*1.7+R.x*.8+seed));
    col=alb*(L*.9+.08)*(.72+.5*b)+vec3(1.,.86,.55)*smoothstep(.93,.97,sin(R.y*5.+R.z*2.)*.5+.5)*.5;
  } else if(kind==10){ /* mirror: the room itself, drawn again from the far side of the glass */
#ifdef ROOMMIR
    col=vec3(.05,.06,.08);
#else
    vec2 suv=gl_FragCoord.xy/uRes; suv.x+=N.x*.1;
    vec3 rf=texture(uMirror,suv).rgb;
    float sil=step(.86,fract((vU.x+vU.y)*2.3))*.035;
    float edge=smoothstep(.0,.05,vU.y)*smoothstep(2.,1.94,vU.y);
    col=rf*vec3(.84,.89,.93)*mix(.5,1.,edge)+vec3(.05,.06,.075)+sil;
#endif
    e=.1; id=0.;
  } else if(kind==11){ /* register or tablet screen: real small text from the atlas, live marks on top */
    vec3 a=texture(uSigns,vU).rgb;
    vec2 u=(vU-uTill.xy)/(uTill.zw-uTill.xy);
    if(seed<.5){
      /* live bars in the right column */
      if(u.x>.635&&u.x<.965&&u.y>.2&&u.y<.62){ float bx=floor((u.x-.635)*42.); float hh=.2+.74*abs(sin(bx*1.7+uTime*.9))*abs(sin(bx*.3+uTime*.31)); float vy=(u.y-.2)/.42; a=mix(a,vec3(1.,.22,.2),step(vy,hh)*step(fract((u.x-.635)*42.),.72)*.92); }
      /* blinking cursor */
      if(u.x>.04&&u.x<.075&&u.y>.2&&u.y<.255) a=mix(a,vec3(.2,.95,1.),step(.5,fract(uTime*1.3)));
    }
    /* scanline and a slow roll */
    a*=.9+.1*step(.5,fract(u.y*70.+uTime*1.5)); a+=vec3(.02,.05,.06)*smoothstep(.05,.0,abs(fract(uTime*.11)-u.y));
    col=a*1.2; e=.7; id=0.;
  } else if(kind==8){ /* the mountain and its ski slopes, alpine: snow that holds to the gentle ground, dark granite on the
       steep faces and the high needles, blue ice down the high gullies, spruce forest below the tree line, wind ripples and
       a glitter in the snow, the sun and the shade on every face. Lit here with the key alone (no shadow map, no lamps) */
    float n=texture(uTiles,vec3(P.xz*.0017,9.)).r, n2=texture(uTiles,vec3(P.xz*.0068+.3,9.)).r;
    float nr=texture(uTiles,vec3(P.xz*.031+.7,9.)).r, nf=texture(uTiles,vec3(P.xz*.13,9.)).r;
    float dist=length(Vd);
    /* the face this pixel is on, with a little ground roughness in it */
    vec3 Nf=normalize(N+vec3(nr-.5,0.,nf-.5)*.22);
    /* granite where it is too steep to hold snow, and on the high ridges above the snow line; fresh snow buries more */
    float line=340.+(n-.5)*190.+(n2-.5)*120.-uSky.w*90.;
    float high=smoothstep(line-5.,line+7.,P.y);
    float gully=texture(uTiles,vec3(P.xz*vec2(.021,.0052)+.1,9.)).r;
    float hold=N.y+(nr-.5)*.3+(n2-.5)*.2+uSky.w*.08-high*smoothstep(.56,.42,gully+(n2-.5)*.4)*.22;
    float tl=290.+(n-.5)*80.;
    float rock=(1.-smoothstep(.5,.58,hold-high*.08))*mix(.15,1.,smoothstep(tl-10.,tl+50.,P.y));
    /* blue ice in the high gullies: a glacier tongue with crevasses across it */
    float ice=smoothstep(.4,.33,gully+(n-.5)*.18)*smoothstep(330.,380.,P.y)*(1.-high*.5)*(1.-rock);
    float crev=smoothstep(.07,.0,abs(fract(texture(uTiles,vec3(P.xz*vec2(.006,.018)+.2,9.)).r*11.)-.5)-.38);
    /* spruce below the tree line, in stands with clearings; none on the village, the lift or the chalet's pad */
    float stand=smoothstep(.54,.64,texture(uTiles,vec3(P.xz*.0074+.5,9.)).r+(n2-.5)*.3)*(1.-smoothstep(tl-18.,tl,P.y))*smoothstep(.3,.45,N.y);
    /* the pistes: groomed runs down to the village, cut through the forest (the same lanes as skiPiste in mountain()) */
    float pis=0.;
    if(P.z<-700.&&P.z>-1080.&&P.x>140.&&P.x<590.) pis=(1.-smoothstep(9.,14.,pisteD(P.xz)))*(1.-high);
    stand*=(1.-pis)*smoothstep(50.,72.,length((P.xz-${glv([SKI.vil.x, SKI.vil.z])})*vec2(1.,.75)))*smoothstep(14.,24.,length(P.xz-${glv([SKI.ch.x, SKI.ch.z])}));
    vec2 tg=P.xz*.3; vec2 tc=floor(tg); vec2 tf=fract(tg)-.5-(vec2(h21(tc),h21(tc+7.1))-.5)*.5;
    float tw=fwidth(tg.x)+fwidth(tg.y);
    float tree=smoothstep(.36,.26,length(tf))*step(h21(tc+3.3),stand);
    tree=mix(tree,stand*.34,smoothstep(.25,.9,tw));
    /* close to, the painted forest gives way to the real trees */
    tree*=smoothstep(120.,230.,dist);
    /* snow: soft drifts, wind ripples across the slope, near-white in the sun, blue in the shade */
    float drift=texture(uTiles,vec3(P.xz*.021+.4,9.)).r, rip=texture(uTiles,vec3(P.xz*vec2(.11,.34),9.)).r;
    float near=smoothstep(220.,50.,dist);
    float grain=texture(uTiles,vec3(P.xz*.83+.1,9.)).r;
    vec3 snowA=vec3(.95,.97,1.)*(.9+.16*drift+.12*(rip-.5)*near+.06*(grain-.5)*smoothstep(60.,10.,dist));
    /* corduroy down the fall line on the pistes */
    vec2 fd=normalize(N.xz+vec2(1e-4)); float ac=dot(P.xz,vec2(-fd.y,fd.x));
    snowA*=1.+pis*(.03+.06*(smoothstep(.35,.5,fract(ac*.8))-.5)*near);
    /* granite: warm grey in strata and cracks, dusted with snow on its ledges */
    float strata=texture(uTiles,vec3((P.x+P.z*.7)*.05,P.y*.011+nr*.15,9.)).r;
    vec3 rockA=mix(vec3(.25,.23,.22),vec3(.42,.39,.36),strata)*(.75+.45*nf);
    rockA=mix(rockA,vec3(.85,.88,.94),smoothstep(.58,.72,N.y+(nf-.5)*.4)*.75);
    rockA*=1.-.5*smoothstep(.035,.0,abs(strata-.5))*smoothstep(150.,40.,dist);
    vec3 iceA=mix(vec3(.6,.76,.88),vec3(.86,.92,.97),drift)*(1.-crev*.3*smoothstep(30.,90.,dist));
    vec3 alb8=mix(snowA,iceA,ice);
    alb8=mix(alb8,rockA,rock);
    /* a spruce from above: dark needles, snow on the sun side */
    vec3 treeA=mix(vec3(.07,.12,.09),vec3(.6,.66,.72),smoothstep(-.1,.25,dot(tf,normalize(uMoon.xz+vec2(1e-4))))*.5);
    alb8=mix(alb8,treeA,tree*(1.-rock*.6));
    /* light: the key on each face, the sky's blue fill in the shade */
    float kd=max(dot(Nf,uMoon),0.), sk=.62+.38*Nf.y;
    /* the bright sky and the snow below fill the shaded faces from the south, so the slopes keep their shape out of the sun */
    float fb=max(dot(Nf,vec3(.28,.5,.82)),0.);
    vec3 shade=vec3(.86,.91,1.03);
    /* by night: moonlit, the snow pale blue, the forest and the rock near black */
    vec3 nl=uAmbHi*sk*1.3+uMoonC*kd*1.4; nl=mix(nl,vec3(dot(nl,vec3(.333))),.5);
    col=alb8*nl*vec3(.86,.86,.9);
    /* its feet sink into the warm air over the water */
    col=mix(col,vec3(.42,.14,.2),exp(-max(P.y,0.)*.0062)*.92*smoothstep(250.,700.,dist)); e=1.;
    if(uSky.x>0.){
      vec3 dl=uAmbHi*(sk*.9+fb*.32)*shade+uMoonC*kd*.72;
      vec3 dc=alb8*dl;
      /* a glitter in the sunlit snow close by */
      float gl=step(.997,h21(floor(P.xz*7.)+floor(P.y*7.)*.37))*kd*(1.-rock)*(1.-tree)*smoothstep(90.,20.,dist);
      dc+=gl*uMoonC*1.6;
      /* haze grows with distance, and seen from afar the mountain's feet sit in the haze over the water (not the valley floor close to) */
      float hz=1.-exp(-dist*.00055);
      dc=mix(dc,uFogLo,clamp(hz*.85+.45*exp(-max(P.y,0.)*.03)*smoothstep(300.,800.,dist),0.,.9));
      col=mix(col,dc,uSky.x); }
  } else if(kind==3){ /* wet road and paving */
    float tile=texture(uTiles,vec3(vU*.09,float(layer))).r;
    vec3 L=gL;
    vec3 pl=poolAt(P.xz)*uPoolK;
    /* asphalt painted for the night reads near black in daylight: lighter by day */
    alb=mix(alb,alb*1.7+vec3(.035,.035,.04),uSky.x);
    col=alb*mix(1.,tile,.7)*(L*.9)+alb*pl*2.2+pl*.1;
    float trk=0.;
    if(layer==10){
      vec2 pg=P.xz*vec2(.31,.13); float ph=h21(floor(pg)+3.7); vec2 pf=abs(fract(pg)-.5);
      col*=1.-.3*step(.8,ph)*step(pf.x,.42)*step(pf.y,.36);
      col*=1.+.28*step(ph,.1)*step(pf.x,.3)*step(pf.y,.44);
      float ln=abs(abs(fract(P.x/3.3+.5)-.5)-.2); trk=(1.-smoothstep(.03,.05,ln))*smoothstep(.3,.52,texture(uTiles,vec3(P.xz*vec2(.02,.004),9.)).r);
      col*=1.-.2*trk;
      float crk=texture(uTiles,vec3(P.xz*.09,9.)).r; col*=1.-.32*smoothstep(.015,.0,abs(crk-.52));
    }
#ifndef MIRROR
    if(uReflOn>.5){
      float pud2=texture(uTiles,vec3(P.xz*.067+.3,9.)).r; float pud=smoothstep(.47,.5,texture(uTiles,vec3(P.xz*.011,9.)).r*.62+pud2*.46);
      pud=max(pud,trk*.55);
      float fres=pow(1.-max(-V.y,0.),3.);
      float k=mix(.14,.86,pud)*mix(.2,1.,fres); if(P.y>2.) k*=.3;
      /* a dry street keeps a little sheen; snow hides it */
      k*=mix(.3,1.,uSky.z)*(1.-uSky.w*.85);
      vec2 suv=gl_FragCoord.xy/uRes; float wob=tile-.75; suv.x+=wob*.004+(pud2-.5)*.006;
      float jit=h21(gl_FragCoord.xy*.73)-.5; float sp=mix(.05,.016,pud);
      vec3 r=vec3(0.); for(int i=0;i<5;i++){ float o=(float(i)-2.+jit)*sp; r+=texture(uRefl,suv+vec2(jit*.0016,o)).rgb; } r*=.2*(1.+.22*pud);
      col=mix(col,r,k);
    }
#endif
  } else if(kind==12){ /* water */
    vec2 w1=P.xz*.018+vec2(uTime*.02,uTime*.031), w2=P.xz*.05-vec2(uTime*.04,-uTime*.018);
    float n1=texture(uTiles,vec3(w1,9.)).r-.5, n2=texture(uTiles,vec3(w2,9.)).r-.5; float nn=n1+n2*.6;
    vec3 base=mix(vec3(.008,.02,.034),vec3(.012,.018,.04),smoothstep(0.,1.,-V.y*3.));
    base=mix(base,vec3(.05,.09,.12)*(uAmbHi+.3),uSky.x);
    float fres=.32+.68*pow(1.-max(-V.y,0.),2.2);
    vec3 r=vec3(.02,.03,.05);
#ifndef MIRROR
    if(uReflOn>.5){ vec2 suv=gl_FragCoord.xy/uRes; float depthFade=clamp(40./length(Vd)+.35,0.,1.); suv.x+=nn*.012; suv.y+=nn*.05*depthFade; float jit=h21(gl_FragCoord.xy*.73)-.5; float sp=.01+.024*depthFade; r=vec3(0.); for(int i=0;i<5;i++){ r+=texture(uRefl,suv+vec2(jit*.003,(float(i)-2.+jit)*sp)).rgb; } r*=.2; }
    else { r=poolAt(P.xz)*.8+vec3(.02,.03,.05); }
#endif
    col=mix(base,r*1.55,max(fres,.6));
    float flat_=step(.12,nn);
    col*=.9+.14*flat_;
    id=0.;
  } else { /* plain toon with an optional painted tile */
    float tile=1.;
    if(layer>0){ tile=mix(1.,texture(uTiles,vec3(vU,float(layer))).r,.8); }
    if(uRoomMode>.5&&(layer==1||layer==4)){ alb=mix(vec3(dot(alb,vec3(.33))),alb,.8); }
    if(uRoomMode>.5&&layer==4){ float pv=texture(uTiles,vec3(vU*.19,9.)).r; tile*=.76+.5*pv; tile*=1.-.26*smoothstep(.6,.625,texture(uTiles,vec3(vU.x*.8,vU.y*.11,9.)).r); }
    vec3 L=gL;
    if(uRoomMode<.5){ L+=poolAt(P.xz)*uPoolK*exp(-max(P.y,0.)*.05)*2.; }
    float g=kind==14?1.:1.;
    col=alb*tile*L;
    if(kind==14){ vec4 s=texture(uSigns,vU); if(s.a<.04) discard; col=s.rgb*alb*L; }
    if(em0>0.){ col+=alb*em0*(kind==14?.0:1.); e=em0; if(em0>.6) id=0.; }
  }
  /* snow lying on whatever faces up, in drifts first */
  if(uSky.w>0.&&uRoomMode<.5&&(kind==0||kind==2||kind==3||kind==9)&&N.y>.5){
    float sn=texture(uTiles,vec3(P.xz*.043,9.)).r;
    float cov=smoothstep(.5,.85,N.y)*clamp(uSky.w*1.6-(1.-sn)*.9,0.,1.);
    vec3 sc=vec3(.93,.95,1.)*(uAmbHi*1.05+uMoonC*max(dot(N,uMoon),0.)*.9*gSh)+poolAt(P.xz)*uPoolK*1.5;
    col=mix(col,sc,cov);
  }
  if(kind!=8) col=fogIt(col,P,e);
  O=vec4(col,id/255.);
}`;

/* ---------- sky ---------- */
const SKY_VS = /* glsl */`
precision highp float; uniform mat4 viewMatrix, projectionMatrix; uniform vec3 cameraPosition; uniform float uMY;
in vec3 position; out vec3 vD;
void main(){ vD=position; vec3 d=position;
#ifdef MIRROR
  d.y=-d.y;
#endif
  vec4 p=projectionMatrix*mat4(mat3(viewMatrix))*vec4(d,1.); gl_Position=p.xyww; gl_Position.z=p.w*.99999; }`;
const SKY_FS = /* glsl */`
precision highp float; precision highp sampler2DArray; in vec3 vD; layout(location=0) out vec4 O;
uniform vec3 uMoonDir; uniform vec3 uShaft[3]; uniform float uTime; uniform sampler2DArray uTiles;
/* uSky: x daylight (0 is the night as painted), z cloud cover; the day sky's own colours come from the page */
uniform vec4 uSky; uniform vec3 uSunDir, uSunC, uSkyH, uSkyZ, uHazeC, uCloudB, uCloudR;
${NOISE_GLSL}
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y); }
float tx(vec2 p){ return texture(uTiles,vec3(p,9.)).r; }
float cloudN(vec2 p){ return tx(p)*.72+tx(p*2.61+vec2(.37,.11))*.22+tx(p*5.7+.2)*.06; }
void main(){
  vec3 d=normalize(vD);
  float y=d.y; float az=atan(d.x,-d.z);
  /* deep teal overhead; magenta and amber only in the last few degrees, lit from under by the city */
  vec3 c=mix(vec3(.86,.36,.15),vec3(.6,.15,.27),smoothstep(.004,.05,y));
  c=mix(c,vec3(.2,.075,.24),smoothstep(.035,.105,y));
  c=mix(c,vec3(.06,.1,.19),smoothstep(.085,.2,y));
  c=mix(c,vec3(.05,.16,.215),smoothstep(.18,.38,y));
  c=mix(c,vec3(.03,.1,.15),smoothstep(.38,.92,y));
  float cityK=exp(-pow(az*.82,2.));
  c=mix(c,c*mix(.46,1.,cityK),1.-smoothstep(.0,.2,y));
  /* moon: small, soft maria and limb */
  float mc=dot(d,uMoonDir); float ang=acos(clamp(mc,-1.,1.));
  float R=.05;
  vec3 mT=normalize(cross(vec3(0.,1.,0.),uMoonDir)), mB=cross(uMoonDir,mT); vec2 mp=vec2(dot(d,mT),dot(d,mB))/R;
  c+=vec3(.5,.42,.4)*.12*exp(-max(ang-R,0.)*12.);
  if(ang<R){
    float n=vn(mp*1.7+3.1)*.62+vn(mp*3.9+.7)*.38; float n2=vn(mp*9.+1.3);
    vec3 mo=vec3(.74,.7,.62);
    mo=mix(mo,vec3(.46,.44,.46),smoothstep(.44,.6,n));
    mo*=.9+.2*n2;
    mo*=mix(.62,1.,sqrt(max(1.-dot(mp,mp),0.)));
    mo=mix(mo,mo*vec3(1.1,.72,.58),smoothstep(.2,-1.,mp.y)*.7);
    c=mix(c,mo,smoothstep(R,R-.0018,ang));
  }
  /* stars, only where the night is clear */
  if(uSky.z<1.&&y>.08){ vec2 sg=vec2(az*170.,y*170.); float hs=h21(floor(sg)); float sp=step(.994,hs)*smoothstep(.42,.1,length(fract(sg)-.5));
    c+=vec3(.8,.85,1.)*sp*(.35+.65*fract(hs*91.7))*(1.-uSky.z)*smoothstep(.08,.3,y)*(1.-uSky.x); }
  /* the day sky, worked out alongside and laid over the night by daylight */
  vec3 dc=mix(uSkyH,uSkyZ,smoothstep(-.02,.6,y));
  float sd=max(dot(d,uSunDir),0.);
  dc+=uSunC*(pow(sd,6.)*.16+pow(sd,48.)*.3)*(1.-uSky.z*.6);
  /* cloud deck in perspective: long stratus, hard edges, the edge toward the city catches its light.
     A clear sky raises the edge the noise must pass, so fewer and smaller clouds */
  vec2 cp=d.xz/(max(y,.016)+.1); vec2 dr=vec2(uTime*.0012,0.);
  float hk=smoothstep(.022,.1,y), hiK=smoothstep(.07,.42,y);
  vec3 bodyLo=vec3(.26,.075,.2), bodyHi=vec3(.075,.2,.25), rimLo=vec3(1.,.5,.27), rimHi=vec3(.2,.5,.54);
  float lightAcc=0., cT=(1.-uSky.z)*.16, occ=0.;
  /* by day a cloud's lit edge faces the sun */
  vec3 dB=uCloudB, dR=uCloudR*(1.+sd*.4);
  /* overhead the noise is stretched into one blob: on a clear day leave it open */
  float zk=1.-smoothstep(.45,.75,y)*(1.-uSky.z);
  /* wide slow bands */
  { vec2 a=vec2(cp.x*.021+.37,cp.y*.155+.11)+dr*.5; float n=cloudN(a), e=smoothstep(.5+cT,.508+cT,n), eB=smoothstep(.5+cT,.508+cT,cloudN(a+vec2(0.,-.0075)));
    c=mix(c,mix(bodyLo*.8,bodyHi*.72,hiK),e*hk*zk); c=mix(c,mix(rimLo*.72,rimHi*.6,hiK),e*(1.-eB)*hk*zk); lightAcc=e*zk;
    dc=mix(dc,dB*.94,e*hk*zk); dc=mix(dc,dR*.96,e*(1.-eB)*hk*zk); occ=e*hk*zk; }
  /* the main stratus */
  { vec2 a=vec2(cp.x*.047,cp.y*.36)+dr; float n=cloudN(a), e=smoothstep(.515+cT,.524+cT,n), eB=smoothstep(.515+cT,.524+cT,cloudN(a+vec2(0.,-.016)));
    c=mix(c,mix(bodyLo,bodyHi,hiK),e*hk*zk); c=mix(c,mix(rimLo,rimHi,hiK),e*(1.-eB)*hk*zk); lightAcc=max(lightAcc,e*zk);
    dc=mix(dc,dB,e*hk*zk); dc=mix(dc,dR,e*(1.-eB)*hk*zk); occ=max(occ,e*hk*zk); }
  /* short flat scraps high up */
  { vec2 a=vec2(cp.x*.13+.2,cp.y*.62+.3)+dr*1.2; float n=cloudN(a), e=smoothstep(.535+cT,.545+cT,n), eB=smoothstep(.535+cT,.545+cT,cloudN(a+vec2(0.,-.03))); float kk=smoothstep(.16,.42,y)*.9*zk; c=mix(c,bodyHi*1.05,e*kk); c=mix(c,rimHi*.82,e*(1.-eB)*kk); lightAcc=max(lightAcc,e*kk);
    dc=mix(dc,dB*1.04,e*kk); dc=mix(dc,dR,e*(1.-eB)*kk); occ=max(occ,e*kk); }
  /* thin high lines */
  { vec2 a=vec2(cp.x*.03+.61,cp.y*1.15+.4)+dr*1.4; float e=smoothstep(.56+cT,.572+cT,cloudN(a)); c=mix(c,mix(rimLo*.55,rimHi*.55,hiK),e*hk*.5); dc=mix(dc,dR,e*hk*.4); }
  /* tower searchlights land on the deck */
  for(int i=0;i<3;i++){ float a=dot(d,uShaft[i]); float h=smoothstep(.9985,.9999,a); c+=vec3(.62,.8,.9)*h*h*(lightAcc*.55+.03*uSky.z); }
  /* smog right at the horizon */
  c=mix(c,vec3(.8,.34,.15)*mix(.5,1.,cityK),smoothstep(.02,-.022,y)*.9);
  /* haze the far towers melt into, so a gap between them never opens onto bare horizon */
  c=mix(c,mix(vec3(.16,.07,.14),vec3(.3,.11,.2),cityK),1.-smoothstep(.035,.12,y));
  /* the sun's disc, behind cloud when there is cloud, then the day's own haze at the horizon */
  dc=mix(dc,uSunC*1.25+.25,smoothstep(.99962,.99972,sd)*(1.-occ)*(1.-uSky.z*.85));
  dc=mix(dc,uHazeC,smoothstep(.03,-.03,y)*.85); dc=mix(dc,uHazeC,(1.-smoothstep(.035,.14,y))*.55);
  c=mix(c,dc,uSky.x);
  O=vec4(c,0.);
}`;

/* ---------- additive light: halos, car lights ---------- */
const GLOW_VS = /* glsl */`
precision highp float; uniform mat4 viewMatrix, projectionMatrix; uniform vec3 cameraPosition; uniform float uTime, uMY, uSizeK;
in vec3 position; in vec3 iPos; in vec4 iCol;
out vec2 vQ; out vec3 vC; out vec3 vWp;
void main(){
  float s=abs(iCol.a);
  vec3 p=iPos;
  float an=iCol.a<0.? .62+.38*sin(uTime*1.7+p.x*.3+p.z*.7):1.;
  vec3 cr=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]), up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
  vec3 w=p+(cr*position.x+up*position.y)*s;
#ifdef MIRROR
  w.y=2.*uMY-w.y;
#endif
  vec4 vp=viewMatrix*vec4(p,1.);
  vQ=position.xy*2.; vC=iCol.rgb*an; vWp=p;
  gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);
}`;
const GLOW_FS = /* glsl */`
precision highp float; in vec2 vQ; in vec3 vC; in vec3 vWp; layout(location=0) out vec4 O; uniform vec3 cameraPosition; uniform float uGlowK;
void main(){
  float d=length(vQ); if(d>1.) discard;
  float a=pow(1.-d,2.8)*.55+smoothstep(.1,.04,d)*.3;
  float dg=length(vWp-cameraPosition); float far=exp(-dg*.00028);
  float st=(1.-smoothstep(26.,60.,vWp.y))*smoothstep(70.,260.,dg);
  O=vec4(vC*a*uGlowK*(.35+.65*far)*(1.-.72*st),0.);
}`;

/* ---------- traffic: position comes from time, car bodies and their lights share it ---------- */
const CAR_COMMON = /* glsl */`
uniform highp sampler2D uLanes; uniform float uTime;
in vec4 iLane; /* lane row, phase, speed (fractions per second), side offset */
in vec4 iLook; /* colour r,g,b, scale */
in float iH;   /* height offset */
void carAt(out vec3 p, out vec3 T, out float fade){
  float row=iLane.x; ivec2 sz=textureSize(uLanes,0);
  float s=fract(iLane.y+uTime*iLane.z)*float(sz.x-1); int i=int(s); float f=s-float(i);
  vec3 a=texelFetch(uLanes,ivec2(i,int(row)),0).xyz, b=texelFetch(uLanes,ivec2(min(i+1,sz.x-1),int(row)),0).xyz;
  vec3 c=texelFetch(uLanes,ivec2(min(i+2,sz.x-1),int(row)),0).xyz;
  T=b-a; float l=length(T); if(l<1e-3){T=c-b; l=length(T);} T/=max(l,1e-3);
  vec3 S=normalize(cross(T,vec3(0.,1.,0.)));
  p=mix(a,b,f)+S*iLane.w+vec3(0.,iH,0.);
  float e=fract(iLane.y+uTime*iLane.z); fade=smoothstep(0.,.02,e)*smoothstep(1.,.98,e);
}`;
const CAR_VS = /* glsl */`
precision highp float; uniform mat4 viewMatrix, projectionMatrix; uniform float uMY;
in vec3 position; in vec3 normal; in vec4 aCol;
out vec3 vW; out vec3 vN; out vec4 vC; flat out vec4 vI;
${CAR_COMMON}
#ifdef WALK
/* a small skeleton: aRig = part (0 body, +-1 leg, +-2 arm, 3 coat or skirt, 5 ground), then the weights of its three joints
   iGait = steps (rad/s), stride angle, yaw, phase. Stride and step rate come from walking speed, so the feet do not skate */
in vec4 aRig; in vec4 iGait;
const float PI_=3.14159265;
vec2 yzR(vec2 v,float a){ float c=cos(a),s=sin(a); return vec2(v.x*c+v.y*s,v.y*c-v.x*s); }
void bend(inout vec3 q,inout vec3 n,float py,float a){ q.yz=yzR(q.yz-vec2(py,0.),a)+vec2(py,0.); n.yz=yzR(n.yz,a); }
float gThigh(float p){ return .04+iGait.y*sin(p); }
float gFlex(float p){ float c=max(0.,cos(p+.5)); return .05+iGait.y*2.3*c*c; }
float gToe(float p){ float s=sin(p); return s*(s>0.?.22:.55)*min(iGait.y*2.4,1.); }
float gSole(float p){ float th=gThigh(p),fl=gFlex(p),al=gToe(p); vec2 a=vec2(.9,0.)+yzR(vec2(-.43,0.),th)+yzR(vec2(-.39,0.),th-fl); return min(a.x+yzR(vec2(-.08,-.07),al).x,a.x+yzR(vec2(-.08,.16),al).x); }
#endif
void main(){
  vec3 p,T; float fade; carAt(p,T,fade);
  vec3 S=normalize(cross(T,vec3(0.,1.,0.))), U=cross(S,T);
  float k=iLook.a*step(.001,fade);
  vec3 pos=position, nor=normal;
#ifdef WALK
  /* people are built right handed so their lit side is the outside */
  S=-S;
  float part=aRig.x, kind=abs(part), side=part<0.?-1.:1.; float A=iGait.y, ph=uTime*iGait.x+iGait.w, y0=pos.y;
  if(kind<4.5){
    float up=smoothstep(.85,1.42,y0);
    if(kind>.5&&kind<1.5){
      float q=ph+(side<0.?PI_:0.), th=gThigh(q), fl=gFlex(q);
      bend(pos,nor,.08,(gToe(q)-th+fl)*aRig.w);
      bend(pos,nor,.47,-fl*aRig.z);
      bend(pos,nor,.9,th*aRig.y);
    } else if(kind>1.5&&kind<2.5){
      float q=ph+(side<0.?0.:PI_), sw=A*.9*sin(q)+.03*sin(uTime*.9+iGait.w);
      bend(pos,nor,1.12,(.3+A*1.1*max(0.,sin(q)))*aRig.z);
      bend(pos,nor,1.41,sw*aRig.y);
    } else if(kind>2.5){
      float s=clamp(pos.x/.13,-1.,1.)*.5+.5, q=ph-.45;
      float a=mix(gThigh(q+PI_),gThigh(q),s)*.78*aRig.y;
      bend(pos,nor,.95,a);
      pos.z-=aRig.y*aRig.y*A*.16;
    }
    /* whole body: leaning into the step, shoulders against the hips, the weight going from foot to foot */
    float lean=A*.14*up; if(kind<.5||kind>1.5&&kind<2.5) bend(pos,nor,.9,lean);
    float tw=-A*.26*sin(ph)*up; float ct=cos(tw),st=sin(tw); pos.xz=vec2(pos.x*ct+pos.z*st,pos.z*ct-pos.x*st); nor.xz=vec2(nor.x*ct+nor.z*st,nor.z*ct-nor.x*st);
    float hips=smoothstep(.15,.9,y0);
    if(A>.01) pos.x-=cos(ph)*A*.075*hips;
    else { pos.x+=sin(uTime*.8+iGait.w)*.022*smoothstep(.1,1.5,y0); pos.y+=sin(uTime*1.5+iGait.w)*.003*up; }
    pos.y-=min(gSole(ph),gSole(ph+PI_));
  }
  float cy=cos(iGait.z),sy=sin(iGait.z); pos.xz=vec2(pos.x*cy+pos.z*sy,pos.z*cy-pos.x*sy); nor.xz=vec2(nor.x*cy+nor.z*sy,nor.z*cy-nor.x*sy);
#endif
  vec3 w=p+(S*pos.x+U*pos.y+T*pos.z)*k;
  vW=w; vN=S*nor.x+U*nor.y+T*nor.z; vC=aCol; vI=vec4(iLook.rgb,iLane.x);
#ifdef MIRROR
  w.y=2.*uMY-w.y;
#endif
  gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);
}`;
const CAR_FS = /* glsl */`
precision highp float; in vec3 vW; in vec3 vN; in vec4 vC; flat in vec4 vI; layout(location=0) out vec4 O;
uniform vec3 cameraPosition, uMoon, uAmbHi, uAmbLo, uFogHi, uFogLo; uniform float uFogD, uFogH, uPoolR, uPoolK; uniform sampler2D uPool;
uniform vec4 uSky; uniform vec3 uMoonC, uSkyH, uSkyZ;
void main(){
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N; vec3 V=normalize(vW-cameraPosition);
  /* vertex alpha picks a part: 0 own colour, 1 paint, 2 dark glass, 3 light */
  float tag=vC.a*255.; vec3 c;
  float id=33.+mod(vI.a*7.,50.);
#ifdef WALK
  /* each garment carries its own ink id while the figure is close enough to hold the lines */
  float raw=floor(tag+.5); tag=mod(raw,4.); id+=floor(raw/4.)*11.*step(length(vW-cameraPosition),36.);
#endif
  if(tag>2.5){ c=vC.rgb*1.15; id=0.; }
  else {
    vec3 pool=texture(uPool,(vW.xz+uPoolR)/(2.*uPoolR)).rgb*uPoolK;
    vec3 L=mix(uAmbLo,uAmbHi,N.y*.5+.5)+pool*1.5*exp(-max(vW.y,0.)*.03);
    float m=dot(N,uMoon); L+=mix(vec3(.3,.34,.46)*.5,uMoonC*.8,uSky.x)*step(.25,m);
    L=min(L,vec3(mix(.72,1.5,uSky.x)));
    if(tag>1.5){
      /* glass: near black, a band of sky and street lying across it */
      vec3 R=reflect(V,N); float h=clamp(R.y*1.4+.25,0.,1.);
      vec3 sky=mix(vec3(.2,.1,.06),vec3(.02,.05,.09),h);
      sky=mix(sky,mix(uSkyH,uSkyZ,h)*.6,uSky.x);
      c=vec3(.004,.006,.011)+sky*(.14+.86*pow(1.+dot(V,N),3.))*.62+pool*.07;
      c+=vec3(.5,.62,.75)*step(.9,sin((vW.x+vW.z)*3.1+vW.y*11.)*.5+.5)*.12;
    } else {
      vec3 alb=tag>.5? vI.rgb : vC.rgb;
      float spec=step(.86,dot(reflect(V,N),uMoon));
      c=alb*L+alb*spec*.16;
      float rim=1.+dot(V,N);
#ifdef WALK
      /* flat tones: lit side and shade with a hard step, and the street's own colour running round the edge */
      float lit=smoothstep(.02,.1,N.y*.62+m*.5+.12);
      c=alb*(L*mix(.72,1.4,lit)+pool*.5+.06);
      c+=(vec3(.16,.24,.36)*.5+pool*.8)*smoothstep(.66,.72,rim)*(.45+alb*1.2);
#else
      c+=vec3(.2,.34,.5)*.26*smoothstep(.72,.76,rim);
#endif
      c=min(c,vec3(mix(.74,1.2,uSky.x)));
    }
  }
  vec3 D=vW-cameraPosition; float d=length(D); float k=uFogH; float f=abs(D.y)>.01?(exp(-k*cameraPosition.y)-exp(-k*(cameraPosition.y+D.y)))/(k*D.y):exp(-k*cameraPosition.y);
  float a=1.-exp(-uFogD*d*f); c=mix(c,mix(uFogHi,uFogLo,exp(-max(vW.y,0.)*.012)),clamp(a,0.,1.));
  O=vec4(c,id/255.);
}`;
const CARGLOW_VS = /* glsl */`
precision highp float; uniform mat4 viewMatrix, projectionMatrix; uniform vec3 cameraPosition; uniform float uMY;
in vec3 position; out vec3 vQ; out vec3 vC2;
${CAR_COMMON}
void main(){
  vec3 p,T; float fade; carAt(p,T,fade);
  vec3 toC=normalize(cameraPosition-p); float fr=dot(T,toC);
  vec3 headC=vec3(.95,.97,1.), tailC=vec3(1.,.09,.07);
  vec3 cc=fr>0.?headC:tailC;
  float part=position.z; float side=mod(part,2.)<.5?-1.:1.; float road=step(1.5,part);
  float K=iLook.a;
  vec3 S=normalize(cross(T,vec3(0.,1.,0.)));
  vec3 at=p+T*sign(fr)*2.32*K+S*side*.66*K+vec3(0.,.62*K,0.);
  float dd=length(cameraPosition-p);
  vec3 w;
  if(road<.5){
    vec3 cr=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]), up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
    float sz=(.7*K+dd*.0058)*(fr>0.?1.15:.9);
    w=at+(cr*position.x+up*position.y)*sz;
    vC2=cc*fade*(.5+.5*abs(fr))*exp(-dd*.0002);
  } else {
    /* the lamp lying on wet asphalt, stretched toward the viewer */
    vec3 g=at; g.y=p.y+.06;
    vec3 dir=cameraPosition-g; dir.y=0.; dir=normalize(dir);
    vec3 pp=cross(dir,vec3(0.,1.,0.));
    float len=min(9.+dd*.05,24.)*step(K,1.5)*step(dd,260.);
    w=g+dir*(position.y+.5)*len+pp*position.x*.75*K;
    vC2=cc*fade*.34*(fr>0.?.8:1.);
#ifdef MIRROR
    w=g; vC2*=0.;
#endif
  }
#ifdef MIRROR
  w.y=2.*uMY-w.y;
#endif
  vQ=vec3(position.xy*2.,road);
  gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);
}`;
const CARGLOW_FS = /* glsl */`
precision highp float; in vec3 vQ; in vec3 vC2; layout(location=0) out vec4 O; uniform vec2 uLamp;   /* lamps, and their streaks on the road: less by day, none on a dry road */
void main(){
  float a;
  if(vQ.z>.5){ float across=1.-abs(vQ.x); float along=1.-(vQ.y*.5+.5); a=across*across*pow(1.-along,1.4)*smoothstep(0.,.14,along)*uLamp.y; }
  else { float d=length(vQ.xy); if(d>1.) discard; a=(pow(1.-d,2.)*.8+smoothstep(.3,.12,d)*.9)*uLamp.x; }
  O=vec4(vC2*a,0.);
}`;

/* ---------- light streams: lanes of traffic read as continuous beads of light ---------- */
const STREAM_VS = /* glsl */`
precision highp float; uniform mat4 viewMatrix, projectionMatrix; uniform vec3 cameraPosition;
in vec3 position; out vec2 vQ; out vec3 vC2;
${CAR_COMMON}
void main(){
  vec3 p,T; float fade; carAt(p,T,fade);
  vec3 toC=normalize(cameraPosition-p); vec3 W=normalize(cross(T,toC));
  float dd=length(cameraPosition-p);
  float wid=.09+dd*.00085;
  vec3 w=p+T*position.y*iLook.a+W*position.x*wid*2.;
  vQ=position.xy*2.; vC2=iLook.rgb*fade*(.45+.55*exp(-dd*.0006))*smoothstep(170.,420.,dd);
  gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);
}`;
const STREAM_FS = /* glsl */`
precision highp float; in vec2 vQ; in vec3 vC2; layout(location=0) out vec4 O; uniform vec2 uLamp;
void main(){ float a=(1.-vQ.x*vQ.x); a*=a; float l=vQ.y*.5+.5; a*=smoothstep(0.,.5,l)*smoothstep(1.,.92,l)*uLamp.x; O=vec4(vC2*a,0.); }`;

/* ---------- additive shapes in space: searchlights, light shafts, hologram ---------- */
const FX_VS = /* glsl */`
precision highp float; uniform mat4 modelMatrix, viewMatrix, projectionMatrix; uniform float uTime;
in vec3 position; in vec4 normal; in vec4 aCol; in vec2 aUv; in vec4 aMat;
out vec3 vW; out vec3 vN; out vec4 vC; out vec2 vU; flat out vec4 vM;
void main(){ vec3 p0=position; if((int(aMat.x)&15)==8) p0.y+=fract(uTime*.19+aMat.w/255.)*1.62; vec4 w=modelMatrix*vec4(p0,1.); vW=w.xyz; vN=mat3(modelMatrix)*normal.xyz; vC=aCol; vU=aUv; vM=aMat; gl_Position=projectionMatrix*viewMatrix*w; }`;
const FX_FS = /* glsl */`
precision highp float; in vec3 vW; in vec3 vN; in vec4 vC; in vec2 vU; flat in vec4 vM; layout(location=0) out vec4 O;
uniform float uTime, uDayFx; uniform vec3 cameraPosition; uniform sampler2D uAds;
void main(){
  int kind=int(vM.x)&15; vec3 V=normalize(vW-cameraPosition); vec3 N=normalize(vN);
  /* by day light in the air hardly shows */
  float dayK= kind==1||kind==4 ? 1.-uDayFx*.92 : 1.-uDayFx*.6;
  float a=vC.a; vec3 c=vC.rgb;
  if(kind==1){ /* soft cone or shaft, fades along its length and at its grazing edges */
    float ed=abs(dot(V,N)); float l=1.-clamp(vU.y,0.,1.); a*=pow(ed,2.6)*l*l;
    a*=.8+.2*sin(vU.y*20.+uTime*.6);
  } else if(kind==2){ /* hologram with scan rows */
    float ed=abs(dot(V,N));
    float rows=step(.4,fract(vW.y*.42-uTime*.6));
    a*=(.42+.58*(1.-ed))*(.5+.5*rows);
    float fl=fract(sin(floor(uTime*9.)*91.7)*43758.5);
    a*=.82+.18*sin(uTime*11.); a*=step(.03,fl)*.5+.5;
  } else if(kind==3){ /* flat shape of light */
    a*=(1.-clamp(vU.y,0.,1.));
  } else if(kind==5){ /* small holo in the shop: fine scan rows */
    float ed=abs(dot(V,N));
    a*=(.6+.4*(1.-ed))*(.55+.45*step(.4,fract(vW.y*24.-uTime*.9)));
    a*=.85+.15*sin(uTime*13.);
  } else if(kind==4){ /* street haze: only reads from the air, never a veil when you are down in it */
    a*=(1.-clamp(vU.y,0.,1.))*smoothstep(90.,320.,length(vW-cameraPosition));
    a*=.72+.28*sin(vW.x*.013+uTime*.05)*sin(vW.x*.031-uTime*.03);
  } else if(kind==6){ /* a screen's light lying on the wall around it, in the colours it is showing */
    float t=uTime/7.+vM.w/255.*16.; float ci=floor(t); vec2 cc=vec2(mod(ci,4.),3.-mod(floor(ci/4.),4.));
    vec2 sa=(vec2(.5)+cc)/4.; sa.y=.25+.75*sa.y; vec3 ac=textureLod(uAds,sa,6.5).rgb; c=ac*1.7+.04;
    vec2 q=vU*2.-1.; float r=max(0.,1.-dot(q,q)); a*=r*r;
  } else if(kind==7){ /* a soft round decal of light */
    vec2 q=vU*2.-1.; float r=max(0.,1.-dot(q,q)); a*=pow(r,1.6);
  } else if(kind==8){ /* scan ring climbing the form */
    float hy=clamp((vW.y-.1)/1.62,0.,1.); a*=sin(hy*3.14159);
  }
  O=vec4(c*a*dayK,0.);
}`;

/* ---------- rain ---------- */
const RAIN_VS = /* glsl */`
precision highp float; uniform mat4 viewMatrix, projectionMatrix; uniform vec3 cameraPosition; uniform float uTime, uRainBox; uniform vec4 uCut;
uniform vec4 uRainK;   /* x how much is falling, y snow instead of rain */
in vec3 position; in vec4 iR; out float vA; out float vT; out float vX;
void main(){
  vec3 b=vec3(uRainBox,uRainBox*.8,uRainBox); float sn=uRainK.y;
  /* snow drifts down slowly and wanders */
  vec3 p=iR.xyz*b; p.y-=uTime*mix(46.+iR.w*18.,1.7+iR.w*1.3,sn); p.x+=uTime*mix(3.,.6,sn)+sn*sin(uTime*.7+iR.w*40.)*1.3; p.z+=sn*cos(uTime*.5+iR.x*30.)*.9;
  p=mod(p-cameraPosition+b*.5,b)-b*.5+cameraPosition;
  float L=mix(1.4+iR.w*1.5,.05+iR.w*.04,sn);
  vec3 dir=normalize(vec3(mix(.065,0.,sn),-1.,0.));
  vec3 toC=normalize(cameraPosition-p); vec3 S=normalize(cross(dir,toC));
  vec3 w=p+dir*L*position.y+S*mix(.0075,.028,sn)*(1.+length(p-cameraPosition)*.03)*position.x;
  float d=length(p-cameraPosition);
  vA=smoothstep(uRainBox*.5,uRainBox*.2,d)*smoothstep(.8,3.,d)*(.5+.5*iR.w)*uRainK.x;
  vT=position.y; vX=position.x;
  /* rain stays downtown */
  vA*=smoothstep(520.,180.,length(p.xz-vec2(0.,-40.)));
  /* only on one side of a plane, while a room shows through its window */
  vA*=step(0.,dot(vec4(p,1.),uCut));
  gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);
}`;
const RAIN_FS = /* glsl */`
precision highp float; in float vA; in float vT; in float vX; layout(location=0) out vec4 O; uniform vec3 uRainC; uniform vec4 uRainK;
void main(){ O=vec4(uRainC*vA*mix(1.-vT*.8,max(1.-length(vec2(vX,vT*2.-1.)),0.)*1.7,uRainK.y),0.); }`;

/* ---------- shop glass: real 3D city behind running rain ---------- */
const GLASS_VS = WORLD_VS;
const GLASS_FS = /* glsl */`
precision highp float; precision highp sampler2DArray; in vec3 vW; in vec3 vN; in vec4 vC; in vec2 vU; flat in vec4 vM; layout(location=0) out vec4 O;
uniform sampler2D uBg, uSigns; uniform sampler2DArray uTiles; uniform float uTime, uInside, uDrops; uniform vec4 uSky; uniform vec2 uRes; uniform vec3 cameraPosition;
${NOISE_GLSL}
vec3 drops(vec2 uv){ /* running drops: returns offset xy and a mask */
  vec2 g=vec2(uv.x*13.,uv.y*3.2); float cx=floor(g.x); float hx=h11(cx*1.73);
  g.y+=uTime*(.12+.32*hx)+hx*9.; vec2 c=floor(g); vec2 f=fract(g)-.5; float h=h21(c+3.1);
  f.x+=(h-.5)*.55+.06*sin(g.y*12.+hx*9.);
  float d=length(f*vec2(1.,3.4));
  float m=smoothstep(.2,.08,d)*step(.34,h);
  float tr=smoothstep(.12,.0,abs(f.x))*smoothstep(-.5,.5,f.y)*step(.5,h)*.55;
  vec2 o=f*vec2(.11,.03)*m+vec2(0.,.009)*tr;
  return vec3(o,max(m,tr*.5));
}
void main(){
  vec2 suv=gl_FragCoord.xy/uRes; vec2 uv=vU;
  vec3 d1=drops(uv), d2=drops(uv*1.8+vec2(.31,.2));
  float small=step(.965,h21(floor(uv*vec2(120.,160.))))*smoothstep(.5,.2,length(fract(uv*vec2(120.,160.))-.5));
  /* drops only while it rains */
  vec2 off=(d1.xy+d2.xy*.6)*uDrops;
  float mask=clamp(d1.z+d2.z*.7+small,0.,1.)*uDrops;
  vec3 bg;
  if(uInside>.5){
    vec2 q=suv+off;
    bg=texture(uBg,q).rgb;
    /* only a drop smears what is behind it */
    if(mask>.02){ vec3 sm=(texture(uBg,q+vec2(.002,.005)).rgb+texture(uBg,q-vec2(.002,.005)).rgb+texture(uBg,q+vec2(-.003,.008)).rgb)/3.; bg=mix(bg,sm,mask); bg=bg*(1.2-.2*uSky.x)+vec3(.03,.03,.05)*mask*(1.-uSky.x); }
    /* the pane has a faint breath at the bottom */
    float breath=smoothstep(.34,.0,uv.y)*.05;
    O=vec4(pow(max(bg,0.),vec3(1.08))*.96*vec3(.97,.99,1.02)+vec3(.14,.12,.13)*breath+vec3(.004,.004,.008),1.);
  } else {
    float a=.16+mask*.1;
    O=vec4(vec3(.16,.2,.28)*.5+vec3(.1)*mask,a);
    O.a=a;
  }
}`;

/* ---------- fullscreen passes ---------- */
const FS_VS = /* glsl */`precision highp float; in vec3 position; out vec2 v; void main(){ v=position.xy*.5+.5; gl_Position=vec4(position.xy,0.,1.); }`;
const BRIGHT_FS = /* glsl */`
precision highp float; in vec2 v; layout(location=0) out vec4 O; uniform sampler2D t; uniform vec2 px; uniform float th;
void main(){ vec3 c=vec3(0.); for(int i=0;i<4;i++){ vec2 o=vec2(i<2?-1.:1.,mod(float(i),2.)<1.?-1.:1.)*px; c+=texture(t,v+o).rgb; } c*=.25;
  float l=max(c.r,max(c.g,c.b)); float k=smoothstep(th,th+.25,l); O=vec4(c*k,1.); }`;
const BLUR_FS = /* glsl */`
precision highp float; in vec2 v; layout(location=0) out vec4 O; uniform sampler2D t; uniform vec2 dir;
void main(){ vec3 c=texture(t,v).rgb*.2; float w[4]=float[4](.19,.13,.075,.03); for(int i=0;i<4;i++){ vec2 o=dir*(float(i)*1.5+1.2); c+=(texture(t,v+o).rgb+texture(t,v-o).rgb)*w[i]; } O=vec4(c*1.0,1.); }`;
const POST_FS = /* glsl */`
precision highp float; in vec2 v; layout(location=0) out vec4 O;
uniform sampler2D tC, tD, tB, tB2; uniform vec2 px; uniform float nearZ, farZ, uTime, uGlitch, uScan, uInkW, uInkOn, uBloom, uFade, uGrain;
${NOISE_GLSL}
float lin(float d){ float z=d*2.-1.; return 2.*nearZ*farZ/(farZ+nearZ-z*(farZ-nearZ)); }
void main(){
  vec2 uv=v;
  /* glitch moments: rows slip sideways */
  if(uGlitch>.001){ float r=floor(uv.y*26.+floor(uTime*24.)*3.); float h=h11(r+floor(uTime*18.)); if(h>.72) uv.x+=(h-.86)*.09*uGlitch; }
  vec2 cc=uv-.5; float r2=dot(cc,cc);
  vec2 ca=cc*r2*.0065+vec2(uGlitch*.004,0.);
  vec4 s0=texture(tC,uv);
  vec3 c=vec3(texture(tC,uv+ca).r,s0.g,texture(tC,uv-ca).b);
  /* ink: depth creases and object boundaries, thin with distance */
  if(uInkOn>.5){
    vec2 o=px*uInkW;

    float d0=lin(texture(tD,uv).r);
    float dL=lin(texture(tD,uv-vec2(o.x,0.)).r), dR=lin(texture(tD,uv+vec2(o.x,0.)).r), dU=lin(texture(tD,uv+vec2(0.,o.y)).r), dD=lin(texture(tD,uv-vec2(0.,o.y)).r);
    float lap=abs(dL+dR-2.*d0)+abs(dU+dD-2.*d0);
    float rel=lap/max(d0,.001);
    float eD=smoothstep(.014,.05,rel);
    float i0=floor(s0.a*255.+.5);
    float iL=floor(texture(tC,uv-vec2(o.x,0.)).a*255.+.5), iR=floor(texture(tC,uv+vec2(o.x,0.)).a*255.+.5), iU=floor(texture(tC,uv+vec2(0.,o.y)).a*255.+.5), iD=floor(texture(tC,uv-vec2(0.,o.y)).a*255.+.5);
    float eI=0.; if(i0>.5){ if(iL>.5&&iL!=i0)eI=1.; if(iR>.5&&iR!=i0)eI=1.; if(iU>.5&&iU!=i0)eI=1.; if(iD>.5&&iD!=i0)eI=1.; }
    /* no black outlines on far towers: lines thin to a tint and are gone by 700 m */
    float near=1.-smoothstep(60.,420.,d0), gone=1.-smoothstep(380.,720.,d0);
    float e=max(eD*(i0>.5?1.:.0),eI*.9);
    float l=max(c.r,max(c.g,c.b));
    e*=(1.-smoothstep(.72,.98,l)*.8)*mix(.22,.94,near)*gone;
    vec3 ink=mix(vec3(.012,.012,.02),c*.42,.2+.7*(1.-near));
    c=mix(c,ink,clamp(e,0.,1.));
  }
  if(uBloom>0.){ c+=texture(tB,uv).rgb*uBloom+texture(tB2,uv).rgb*uBloom*.8; }
  /* grade: neutral blacks, an s-curve, saturated accents, rolled highlights */
  float lum=dot(c,vec3(.3,.59,.11));
  c=mix(vec3(lum),c,1.22);
  c=c/(1.+max(c-.85,0.)*.55);
  c=max(c-.004,0.);
  c=mix(c,c*c*(3.-2.*min(c,vec3(1.))),.42);
  /* vignette */
  c*=1.-r2*.58;
  /* scan line on arrival */
  if(uScan>0.&&uScan<1.){ float y=1.-uScan; float s=exp(-abs(v.y-y)*60.); c+=vec3(1.,.25,.2)*s*.55; float b=step(y,v.y); c+=vec3(.08,.01,.012)*b*(1.-uScan); }
  O=vec4(c,1.);
}`;
/* anti-aliasing after the ink, then grain so the grain stays crisp */
const AA_FS = /* glsl */`
precision highp float; in vec2 v; layout(location=0) out vec4 O;
uniform sampler2D t; uniform vec2 px; uniform float uTime, uFade, uGrain;
${NOISE_GLSL}
float Y(vec3 c){ return dot(c,vec3(.3,.59,.11)); }
void main(){
  vec3 cM=texture(t,v).rgb;
  float lM=Y(cM), lNW=Y(texture(t,v+vec2(-1.,1.)*px).rgb), lNE=Y(texture(t,v+vec2(1.,1.)*px).rgb), lSW=Y(texture(t,v+vec2(-1.,-1.)*px).rgb), lSE=Y(texture(t,v+vec2(1.,-1.)*px).rgb);
  float lMin=min(lM,min(min(lNW,lNE),min(lSW,lSE))), lMax=max(lM,max(max(lNW,lNE),max(lSW,lSE)));
  vec3 c=cM;
  if(lMax-lMin>max(.03,lMax*.1)){
    vec2 dir=vec2(-((lNW+lNE)-(lSW+lSE)),(lNW+lSW)-(lNE+lSE));
    float red=max((lNW+lNE+lSW+lSE)*.03125,.0078);
    float rcp=1./(min(abs(dir.x),abs(dir.y))+red);
    dir=clamp(dir*rcp,-1.6,1.6)*px;
    vec3 a=.5*(texture(t,v+dir*(1./3.-.5)).rgb+texture(t,v+dir*(2./3.-.5)).rgb);
    vec3 b=a*.5+.25*(texture(t,v-dir*.5).rgb+texture(t,v+dir*.5).rgb);
    float lb=Y(b); c=(lb<lMin||lb>lMax)?a:b;
  }
  float g=h21(v/px+fract(uTime)*91.)-.5; c+=g*uGrain;
  O=vec4(c*uFade,1.);
}`;
const DEPTH_VS = /* glsl */`precision highp float; uniform mat4 modelMatrix, viewMatrix, projectionMatrix; in vec3 position; void main(){ gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.); }`;
const DEPTH_FS = /* glsl */`precision highp float; layout(location=0) out vec4 O; void main(){ O=vec4(1.); }`;

const HOLO_VS = /* glsl */`
precision highp float; uniform mat4 viewMatrix, projectionMatrix; uniform float uTime; uniform vec3 uHolo; uniform float uHoloL;
in vec3 position; out vec2 vU; out vec3 vW;
vec3 spine(float s){ float t=uTime; return vec3(uHolo.x+(s-.5)*uHoloL*.42+sin(s*4.1-t*.42)*uHoloL*.1*(1.25-s*.75),uHolo.y+(s-.5)*uHoloL*.86+sin(t*.13)*9.,uHolo.z+sin(s*3.4-t*.42+1.)*10.); }
void main(){
  float s=position.x, v=position.y;
  vec3 c=spine(s), c2=spine(s+.01); vec3 T=normalize(c2-c); vec3 N=normalize(vec3(T.y,-T.x,0.));
  vec3 w=c+N*(v-.5)*uHoloL*.5;
  vU=vec2(s,v); vW=w; gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);
}`;
const HOLO_FS = /* glsl */`
precision highp float; in vec2 vU; in vec3 vW; layout(location=0) out vec4 O; uniform sampler2D uTex; uniform float uTime;
void main(){
  vec3 c=texture(uTex,vU).rgb;
  float rows=.82+.18*step(.14,fract(vW.y*.075-uTime*.22));
  float dip=.94+.06*sin(uTime*1.3);
  O=vec4(c*c*.82*rows*dip,0.);
}`;

/* ---------- the island: everything is built here, no models or pictures ---------- */
const SHOP = { x: -23, y: 0, z: 62, w: 11, d: 9, h: 4.1 };
/* the chalet on the ski valley's floor (SKI.ch): its middle, and its floor */
const CH = SKI.ch;
const GYM = { x: 172, z: -150 }, BOWL = innerWidth / innerHeight < .8 ? { x: 34, z: 246 } : { x: 92, z: 244 };
const SHAFTS = [{ o: [0, 620, -235], e: [-210, 980, -320], r: 7, c: [.82, .92, 1], a: .55 }, { o: [-225, 225, 42], e: [-150, 700, -160], r: 5, c: [.5, .95, 1], a: .34 }, { o: [118, 150, 40], e: [240, 620, -180], r: 5, c: [1, .36, .7], a: .3 }];
const ANCHORS = { plan: [-72, 49, 229.2], work: [SHOP.x + SHOP.w / 2 + 1.4, 24, SHOP.z - SHOP.d / 2 - .4], train: [GYM.x, 66, GYM.z + 18], fuel: [CH.x, CH.y + 9, CH.z], school: [-212, 62, 296] };
const ROADS = { ew: [[250, 24], [150, 22], [-30, 22], [-170, 22], [-310, 22]], ns: [[0, 35], [-128, 20], [128, 20], [-262, 20], [262, 20]] };

function curvePts(pts, n, closed = false) { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), closed, 'centripetal'); return c.getSpacedPoints(n).map(v => [v.x, v.y, v.z]); }
const HIGHWAY = curvePts([[1500, 34, 340], [700, 28, 300], [300, 26, 272], [60, 26, 270], [-70, 27, 272], [-122, 28, 250], [-133, 28, 190], [-136, 28, 110], [-132, 31, 10], [-128, 40, -120], [-128, 50, -250], [-60, 54, -316], [70, 56, -320], [130, 52, -240], [134, 48, -110], [190, 46, -40], [420, 42, -26], [1500, 40, -60]], 150);
const RAIL = curvePts([[-262, 37, 150], [0, 37, 150], [240, 37, 150], [262, 37, 120], [262, 37, -280], [240, 37, -310], [-240, 37, -310], [-262, 37, -280], [-262, 37, 120]], 170, true);
const RAIL_CLOSED = RAIL.slice(0, -1);
const BRIDGE = curvePts([[-1900, 52, 960], [-1100, 52, 800], [-520, 46, 610], [-250, 36, 400], [-190, 28, 262], [-160, 25, 196]], 60);

const PAL2 = {
  corpGlass: [0x171c32, 0x1b2038, 0x14182c, 0x20243c], corpSlate: 0x2a3044,
  kitsch: [0xa8483e, 0xd8ac30, 0x4c9c92, 0xd87848, 0x6c7482], concrete: [0xa09aa4, 0x8e8a98, 0xaca6ac, 0x7f8490],
  luxe: [0x5a3a26, 0xcfc4b2, 0x4a3226],
};

function neonStrip(M, x, y, z, w, h, d, c, seed = 0) { const k = M.kind, e = M.em, s = M.seed; M.set({ kind: K.NEON, seed }); M.box(x, y, z, w, h, d, { c, grad: 1 }); M.set({ kind: k, em: e, seed: s }); }
function setPlain(M, c, layer = 0, em = 0) { M.set({ kind: K.PLAIN, layer, c, em, a: 0 }); }

/* a sign blade on a bracket, seen from both sides */
function blade(M, x, y, z, ry, h, idx, R) {
  const w = h * .24, cell = bladeCell(idx);
  setPlain(M, 0x12101e);
  M.rbox(x, y - h / 2 - .1, z, w + .2, h + .2, .24, ry, {});
  M.plate(x + Math.sin(ry) * .13, y, z + Math.cos(ry) * .13, w, h, ry, cell, { seed: R() * 255, em: 255 });
  M.plate(x - Math.sin(ry) * .13, y, z - Math.cos(ry) * .13, w, h, ry + Math.PI, cell, { seed: R() * 255, em: 255 });
}
/* ad screens: sixteen on the island, one per ad, so the same one never shows twice */
let AD_USED = 0; const AD_MAX = 16; const SPILLS = [];
function adRig(M, x, y, z, ry, w, h, R, o = {}) {
  if (AD_USED >= AD_MAX) { wrapSign(M, x, y, z, ry, Math.min(w * .36, 6), h * 1.15, (x | 0) + AD_USED, R); return; }
  const k = AD_USED++, seed = k * 16 + R.int(0, 3), off = o.off === undefined ? 1.7 : o.off, nx = Math.sin(ry), nz = Math.cos(ry), tx = nz, tz = -nx;
  M.at(x, y, z, ry, () => {
    setPlain(M, 0x15151b); M.box(0, -h / 2 - .5, off - .62, w + 1, h + 1, 1.2, {});
    setPlain(M, 0x5c5c66); M.box(0, h / 2 - .02, off + .04, w + .7, .34, .46, {}); M.box(0, -h / 2 - .32, off + .04, w + .7, .34, .46, {}); for (const s of [-1, 1]) M.box(s * (w / 2 + .17), -h / 2 - .32, off + .04, .34, h + .64, .46, {});
    setPlain(M, 0x2c2c34); for (const sx of [-1, 1]) for (const sy of [-1, 1]) M.beam([sx * w * .4, sy * h * .42, off - 1.2], [sx * w * .5, sy * h * .5, -.1], .26, {});
    M.plate(0, 0, off + .26, w, h, 0, [0, 0, 1, 1], { kind: K.AD, seed, em: o.em || 218 });
    /* catwalk and its lamps */
    setPlain(M, 0x2a2a32); const cy = -h / 2 - 1.5; M.box(0, cy, off + .25, w + 2, .18, 1.7, {}); M.box(0, cy + 1, off + 1.05, w + 2, .07, .07, {}); const posts = Math.max(3, Math.round(w / 3.5));
    for (let i = 0; i <= posts; i++) { const px = -w / 2 - 1 + (w + 2) * i / posts; setPlain(M, 0x2a2a32); M.box(px, cy, off + 1.05, .08, 1, .08, {}); if (i < posts) { const lx = px + (w + 2) / posts / 2; M.box(lx, cy + .78, off + .78, .1, .1, .6, {}); setPlain(M, 0x1a1a20); M.box(lx, cy + .76, off + .98, .56, .22, .3, {}); M.set({ kind: K.PLAIN, c: hex(0xfff2d8), em: 255 }); M.box(lx, cy + .98, off + .98, .46, .03, .22, {}); M.set({ em: 0 }); } }
    M.tube([[w / 2 + .4, -h / 2, off - .4], [w / 2 + .7, -h / 2 - 3, .4], [w / 2 + .2, -h / 2 - 8, .1]], .07, 5, 3, { c: 0x08080c });
  });
  for (const u of [-.32, .32]) glow(x + nx * (off + 1) + tx * u * w, y - h / 2 - .9, z + nz * (off + 1) + tz * u * w, 0xffdcb0, 3.2);
  SPILLS.push({ x, y, z, ry, w: w * 2.9, h: h * 2.2, wall: o.wall === undefined ? .16 : o.wall, seed, a: o.spill || 150, roof: o.roof });
  pool(x + nx * 10, z + nz * 10, w * 1.3, 0xffb890, .22);
}
/* a tall flush LED wrap: vertical words on the building's own face */
function wrapSign(M, x, y, z, ry, w, h, idx, R) {
  M.at(x, y, z, ry, () => { setPlain(M, 0x101016); M.box(0, -h / 2 - .3, .1, w + .5, h + .6, .36, {}); setPlain(M, 0x3c3c46); for (const s of [-1, 1]) M.box(s * (w / 2 + .2), -h / 2 - .3, .32, .16, h + .6, .14, {}); M.plate(0, 0, .3, w, h, 0, bladeCell(idx), { seed: R() * 255, em: 205 }); });
  glow(x + Math.sin(ry) * 1.5, y, z + Math.cos(ry) * 1.5, [.3, .2, .2], w * 2.4);
}
/* big letters on a frame on the roof, invented names */
function roofSign(M, x, y, z, w, R) {
  const h = w * .263; setPlain(M, 0x151320);
  for (const dx of [-.4, 0, .4]) M.box(x + dx * w, y, z - .6, .3, h + 3, .3, {});
  M.box(x, y + 1.4, z - .9, w + .6, h + 1.2, .3, {});
  M.plate(x, y + 2 + h / 2, z - .7, w, h, 0, CELL['r' + R.int(0, 3)], { seed: R() * 255, em: 255 });
  glow(x, y + 2 + h / 2, z + 1, R.pick([PAL.yellow, PAL.magenta, PAL.cyan]), w * .8);
}
/* street walls: ledges, pipes, small balconies, boxes on brackets */
function wallDetail(M, x, z, d, H, s, era, R, y0 = 0) {
  const dk = era === 'corp' ? 0x262b40 : era === 'kitsch' ? 0x3a2c44 : 0x4a4656;
  const step = R.range(5.2, 7.6);
  for (let y = 7.2; y < H; y += step) {
    setPlain(M, dk); M.box(x + s * .3, y, z, .7, .34, d - 1, { crease: false });
    if (R.chance(.55)) { /* a run of balconies with junk */
      const n = R.int(2, 4); for (let i = 0; i < n; i++) { const bz = z + R.range(-d * .4, d * .4), bw = R.range(2.2, 4); setPlain(M, dk); M.box(x + s * .8, y + .34, bz, 1.6, .16, bw, {}); setPlain(M, 0x1b1a26); M.box(x + s * 1.56, y + .5, bz, .05, .9, bw, { bot: false }); M.box(x + s * .8, y + .5, bz - bw / 2, 1.6, .9, .05, { bot: false }); M.box(x + s * .8, y + .5, bz + bw / 2, 1.6, .9, .05, { bot: false });
        const t = R(); if (t < .4) { M.set({ kind: K.PLAIN, c: hex(R.pick([0xb9b2c4, 0xc05a8a, 0x5aa2b0, 0xd0a040])), id: M.nid() }); const q = [[x + s * 1.5, y + 2.2, bz - .8], [x + s * 1.5, y + 2.2, bz + .8], [x + s * 1.5, y + 1, bz + .8], [x + s * 1.5, y + 1, bz - .8]]; M.quad(q[0], q[1], q[2], q[3]); M.quad(q[3], q[2], q[1], q[0]); } else if (t < .7) { M.box(x + s * .8, y + .5, bz, .9, .8, .7, { c: 0x4c4a58 }); M.cyl(x + s * 1.26, y + .9, bz, .28, .28, .02, 6, { c: 0x25242e }); } else { M.cyl(x + s * .8, y + .5, bz, .2, .26, .45, 5, { c: 0x5a3a2a }); M.blob(x + s * .8, y + 1.2, bz, .5, { c: 0x234a33, r: R }); } }
    }
    /* a lit strip or plate catches the eye */
    if (R.chance(.3)) neonStrip(M, x + s * .68, y + .36, z, .06, .06, d * R.range(.3, .8), R.pick([PAL.magenta, PAL.cyan, PAL.yellow, PAL.orange]), R() * 250);
  }
  for (let i = 0; i < R.int(2, 4); i++) { const pz = z + R.range(-d * .45, d * .45); M.cyl(x + s * .28, y0, pz, .1, .1, Math.max(.5, H * R.range(.4, 1) - y0), 4, { c: 0x34323e, top: false }); }
  /* window units, vents and drain pipes: hung one by one */
  { const cols = [0x55535e, 0x63606a, 0x45434e, 0x6c6a72]; const n = Math.round(d * Math.min(H, 60) * .05);
    for (let i = 0; i < n; i++) { const yy = R.range(6.2, Math.min(H - 1, 62)), zz = z + R.range(-d * .46, d * .46), t = R();
      if (t < .62) { setPlain(M, R.pick(cols)); M.box(x + s * .36, yy, zz, .72, .62, 1.0, {}); setPlain(M, 0x1a1a20); M.box(x + s * .73, yy + .08, zz, .02, .44, .8, {}); if (R.chance(.4)) M.cyl(x + s * .5, yy - 1.4, zz + .3, .022, .022, 1.4, 3, { c: 0x17171c, top: false }); }
      else if (t < .82) { setPlain(M, 0x3c3a44); M.box(x + s * .2, yy, zz, .4, 1, 1.5, {}); setPlain(M, 0x17171c); for (let k = 0; k < 4; k++) M.box(x + s * .41, yy + .14 + k * .2, zz, .02, .05, 1.3, {}); }
      else { setPlain(M, R.pick([0x7a2020, 0x1f6f78, 0x8f8416, 0x26262e])); M.box(x + s * .16, yy, zz, .1, R.range(.6, 1.4), R.range(.8, 2), {}); } }
    for (let i = 0; i < 2; i++) { const pz = z + R.range(-d * .46, d * .46); M.cyl(x + s * .3, y0, pz, .14, .14, Math.min(H, 60) - y0, 6, { c: 0x2a2a32, top: false }); for (let y = y0 + 2; y < Math.min(H, 60); y += 3.4) M.cyl(x + s * .3, y, pz, .18, .18, .1, 6, { c: 0x1a1a20 }); } }
  /* cable bundles down the wall */
  const cz = z + R.range(-d * .4, d * .4); M.tube([[x + s * .3, H * .6, cz], [x + s * .4, H * .35, cz + R.range(-2, 2)], [x + s * .3, Math.max(5, y0 + 1), cz + R.range(-2, 2)]], .05, 6, 3, { c: 0x07060c });
}
function roofClutter(M, poly, y, R, n = 6) {
  const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  for (let i = 0; i < n; i++) {
    const x = R.range(x0 + 2, x1 - 2), z = R.range(z0 + 2, z1 - 2), t = R();
    setPlain(M, R.pick([0x34384a, 0x3e3a46, 0x2a2e3e, 0x4a4656]));
    if (t < .45) { const w = R.range(1.6, 4.2); M.box(x, y, z, w, R.range(1, 2.4), w * R.range(.6, 1.2), {}); }
    else if (t < .65) { M.cyl(x, y, z, 1.6, 1.6, R.range(2.4, 4), 8, { c: 0x53505e }); M.cyl(x, y + 4, z, 1.8, .2, .9, 8, { c: 0x3a3844 }); }
    else if (t < .8) { const ah = R.range(7, 18); M.cyl(x, y, z, .18, .06, ah, 4, { c: 0x25283a }); if (R.chance(.45)) glow(x, y + ah, z, PAL.red, 4.5, 1); }
    else if (t < .9) { const ds = R.range(1.4, 2.4); M.cyl(x, y, z, .14, .14, 1.4, 4, { c: 0x3a3a44, top: false }); M.at(x, y + 1.4, z, R() * 6.28, () => M.lathe(0, 0, 0, [[.04, 0], [ds * .6, ds * .14], [ds, ds * .42]], 8, { c: 0xb4b0ac, grad: .55 }), .9); }
    else { for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) M.box(x + lx, y, z + lz, .14, 3, .14, { c: 0x25252c }); M.cyl(x, y + 3, z, 1.7, 1.7, 3.2, 8, { c: 0x6a5a4a }); M.cyl(x, y + 6.2, z, 1.8, .15, 1, 8, { c: 0x3a3430 }); }
  }
}

/* one building made of stacked segments with setbacks */
function tower(M, x, z, w, d, h, era, R, o = {}) {
  const seed = R() * 255; const ids = M.nid();
  const style = { corp: R.chance(.7) ? 0 : 1, concrete: 2, kitsch: 3, block: 4, luxe: 5, stone: 6 }[era];
  const base = o.base !== undefined ? o.base : era === 'corp' ? R.pick(PAL2.corpGlass) : era === 'concrete' || era === 'block' ? R.pick(PAL2.concrete) : era === 'kitsch' ? R.pick(PAL2.kitsch) : era === 'luxe' ? R.pick(PAL2.luxe) : 0x6a6578;
  const lit = o.lit !== undefined ? o.lit : { corp: R.range(.17, .34), concrete: R.range(.14, .28), kitsch: R.range(.34, .5), block: R.range(.3, .46), luxe: .4, stone: .24 }[era];
  const segs = o.segs || (era === 'corp' ? R.int(2, 5) : era === 'concrete' ? R.int(1, 2) : R.int(1, 3));
  let y = 0, W = w, D = d, cx = x, cz = z; let topPoly = null;
  const fr = [];
  for (let s = 0; s < segs; s++) { fr.push(s === segs - 1 ? 1 : R.range(.3, .55)); }
  const sum = fr.reduce((a, b) => a + b, 0);
  for (let s = 0; s < segs; s++) {
    const sh = h * fr[s] / sum, y1 = y + sh;
    let poly;
    if (era === 'kitsch') poly = roundPoly(cx, cz, W, D, Math.min(W, D) * R.range(.16, .32), 3);
    else if (era === 'corp' && R.chance(.5)) poly = chamferPoly(cx, cz, W, D, Math.min(W, D) * R.range(.08, .2));
    else poly = rectPoly(cx, cz, W, D);
    M.set({ kind: K.FACADE, em: Math.round(lit * 255), seed, a: style, layer: 0 });
    M.extrude(poly, y, y1, { c: base, grad: .7, top: true, topc: era === 'corp' ? 0x20243a : mixC(base, 0x201830, .4) });
    /* band under each setback */
    setPlain(M, era === 'corp' ? PAL.trim : era === 'luxe' ? PAL.brass : mixC(base, 0x000000, .35));
    const ring = poly.map(p => [p[0] + (p[0] > cx ? .45 : -.45), p[1] + (p[1] > cz ? .45 : -.45)]);
    M.extrude(ring, y1 - .9, y1, { grad: .9, topc: 0x1c1c2a });
    if (era === 'corp' && R.chance(.65)) {
      /* fins climb the corners */
      setPlain(M, PAL.trim);
      const nf = R.int(3, 7);
      for (let i = 0; i < nf; i++) { const t = (i + .5) / nf; const fx = cx - W / 2 + W * t; M.box(fx, y, cz + D / 2 + .3, .34, sh, .7, { c: 0x2a3048 }); M.box(fx, y, cz - D / 2 - .3, .34, sh, .7, { c: 0x2a3048 }); }
    }
    topPoly = poly; y = y1;
    if (s < segs - 1) { const k = R.range(.68, .9), k2 = R.range(.68, .9); W *= k; D *= k2; cx += R.range(-1, 1) * W * .06; cz += R.range(-1, 1) * D * .06; }
  }
  /* crown */
  if (era === 'corp') {
    const cr = R.int(0, 3);
    M.set({ kind: K.PLAIN, c: 0x262b40, em: 0, layer: 0 });
    if (cr === 0) { M.box(cx, y, cz, W * .7, 6, D * .7, {}); M.box(cx, y + 6, cz, W * .4, 5, D * .4, {}); M.cyl(cx, y + 11, cz, .5, .1, h * .12, 4, { c: 0x30354c }); glow(cx, y + 11 + h * .12, cz, PAL.red, 16, 1); }
    else if (cr === 1) { M.at(cx, y, cz, 0, () => { M.loft([rectPoly(0, 0, W, D).map(p => [p[0], 0, p[1]]), rectPoly(0, 0, W * .3, D * .9).map(p => [p[0], W * .3, p[1]])], { c: 0x262b40 }); }); neonStrip(M, cx, y + W * .3, cz, W * .32, .4, D * .9, R.pick([PAL.cool, PAL.cyan, PAL.magenta]), R() * 200); }
    else if (cr === 2) { for (const sx of [-1, 1]) { M.box(cx + sx * W * .33, y, cz, W * .22, h * .06, D * .8, { c: 0x23283c }); } glow(cx + W * .33, y + h * .06, cz, PAL.red, 12, 1); }
    else { roofClutter(M, topPoly, y, R, 5); }
    /* cool edge strip */
    if (R.chance(.7)) { const c = R.pick([PAL.cool, PAL.cool, PAL.cyan, PAL.magenta, PAL.yellow]); neonStrip(M, cx, y + .1, cz + D / 2 + .3, W + .4, .36, .25, c, R() * 200); neonStrip(M, cx + W / 2 + .3, y + .1, cz, .25, .36, D + .4, c, R() * 200); }
  } else {
    /* parapet and clutter */
    setPlain(M, mixC(base, 0x000000, .3));
    const par = rectPoly(cx, cz, W + .5, D + .5);
    if (era !== 'kitsch') M.extrude(par, y, y + 1, { topc: 0x24202f, grad: .9 });
    roofClutter(M, topPoly, y + (era === 'kitsch' ? 0 : .6), R, o.clutter === undefined ? R.int(3, 8) : o.clutter);
    if (era === 'kitsch') { neonStrip(M, cx, y + .05, cz + D / 2 - .4, W * .7, .3, .3, R.pick([PAL.magenta, PAL.yellow, PAL.cyan]), R() * 200); }
  }
  /* AC boxes stuck to the walls of older buildings */
  if ((era === 'concrete' || era === 'block' || era === 'kitsch') && h > 16) {
    const n = Math.min(40, Math.round(h * .5));
    setPlain(M, 0x4c4a58);
    for (let i = 0; i < n; i++) {
      const side = R.int(0, 3), yy = R.range(6, h * .86 / (segs > 1 ? 1.5 : 1)); const a = R.range(-.42, .42);
      const ax = side < 2 ? x + a * w : x + (side === 2 ? 1 : -1) * (w / 2 + .35), az = side < 2 ? z + (side === 0 ? 1 : -1) * (d / 2 + .35) : z + a * d;
      M.box(ax, yy, az, side < 2 ? 1.1 : .7, .8, side < 2 ? .7 : 1.1, { c: R.pick([0x4c4a58, 0x5a5664, 0x3e3c4a]) });
    }
  }
  return { x, z, w, d, h, base, seed };
}
function mixC(a, b, t) { const A = hex(a), B = hex(b), m = mix3(A, B, t); return (Math.round(m[0] * 255) << 16) | (Math.round(m[1] * 255) << 8) | Math.round(m[2] * 255); }

/* a street front: lit shop strip, awning, plate sign */
function front(M, x, z, len, ry, R, o = {}) {
  const c = R.pick([PAL.yellow, PAL.magenta, PAL.cyan, PAL.orange, PAL.red, PAL.green]);
  const nx = Math.sin(ry), nz = Math.cos(ry);
  M.at(x, 0, z, ry, () => {
    setPlain(M, 0x15121f); M.box(0, 0, -.12, len, 5.2, .24, {});
    /* lit glass with goods behind */
    const warm = R.pick([0xffc98a, 0xffe2b0, 0xbfeaff, 0xffb0d0, 0xfff0c0]);
    M.set({ kind: K.PLAIN, em: 50, layer: 0 }); M.box(0, .5, .03, len - .8, 3.1, .08, { c: mixC(warm, 0x402030, .3), grad: .45 }); M.set({ em: 0 });
    /* mullions and silhouettes of stock */
    setPlain(M, 0x100e18); const n = Math.max(2, Math.round(len / 3));
    for (let i = 0; i <= n; i++) M.box(-len / 2 + .4 + (len - .8) * i / n, .5, .12, .12, 3.1, .08, {});
    for (let i = 0; i < n * 2; i++) { const px = R.range(-len / 2 + .8, len / 2 - .8), ph = R.range(.5, 1.7); M.box(px, .5, .1, R.range(.2, .7), ph, .05, { c: mixC(warm, 0x180c28, .75) }); }
    /* awning */
    const ac = R.pick([0x7a1f3a, 0x1d4f5a, 0x8a6a1a, 0x4a2a6a, 0xa03a2a]);
    setPlain(M, ac);
    M.loft([[[-len / 2, 3.9, .1], [len / 2, 3.9, .1], [len / 2, 3.9, .16], [-len / 2, 3.9, .16]], [[-len / 2, 3.35, 1.9], [len / 2, 3.35, 1.9], [len / 2, 3.2, 1.9], [-len / 2, 3.2, 1.9]]], { c: ac });
    if (o.plate !== false) { const cell = CELL['p' + R.int(0, 11)]; setPlain(M, 0x0c0a14); M.box(0, 4, .1, Math.min(len - .4, 9), 1.15, .2, {}); M.plate(0, 4.57, .22, Math.min(len - .6, 8.6), 1.05, 0, cell, { seed: R() * 255, em: 255 }); }
    neonStrip(M, 0, 3.25, 1.92, len - .1, .08, .08, c, R() * 240);
  });
  glow(x + nx * 2, 3.2, z + nz * 2, c, len * .7);
  pool(x + nx * 5, z + nz * 5, Math.max(len * 1.1, 14), c, .24);
}
function palm(M, x, z, h, R, y0 = 0) {
  const lean = R.range(-.04, .04); const trunk = [[x, y0, z], [x + lean * h * .4, y0 + h * .5, z + lean * h * .3], [x + lean * h, y0 + h, z + lean * h * .6]];
  setPlain(M, 0x1c1826); M.tube(trunk, t => lerp(.3, .17, t) * h / 14, 4, 5, { c: 0x241c28 });
  const tx = x + lean * h, tz = z + lean * h * .6, ty = y0 + h; const nf = 9;
  for (let i = 0; i < nf; i++) {
    const a = i / nf * TAU + R.range(-.2, .2), L = h * R.range(.28, .38), droop = R.range(.5, .9);
    const dx = Math.cos(a), dz = Math.sin(a), sx = -dz, sz = dx;
    const P = (t, w) => [tx + dx * L * t + sx * w, ty + L * .34 * Math.sin(t * 2.2) - droop * L * t * t, tz + dz * L * t + sz * w];
    const c = R.pick([0x123428, 0x173d2c, 0x0e2a24, 0x1a4830]);
    M.set({ kind: K.PLAIN, c, em: 0, layer: 0, id: M.nid() });
    const W = L * .1, st = [0, .2, .45, .72, 1], ww = [.2, .9, 1, .62, .04];
    for (let j = 0; j < 4; j++) { const a0 = P(st[j], -W * ww[j]), b0 = P(st[j], W * ww[j]), a1 = P(st[j + 1], -W * ww[j + 1]), b1 = P(st[j + 1], W * ww[j + 1]); M.quad(a0, b0, b1, a1); M.quad(a1, b1, b0, a0); }
  }
}
function pine(M, x, y, z, h, R) { M.set({ kind: K.PLAIN, em: 0, layer: 0 }); M.cyl(x, y, z, h * .05, h * .04, h * .2, 4, { c: 0x241c20 }); for (let i = 0; i < 3; i++) { const yy = y + h * (.15 + i * .26), r = h * (.3 - i * .075); M.cyl(x, yy, z, r, 0, h * .42, 6, { c: i === 2 ? 0xc8d4e8 : R.pick([0x123430, 0x163a38]) , top: false, grad: .55 }); } }

function buildGroundAndRoads(M) {
  /* island plate with a shore wall */
  const shore = []; const N = 40;
  for (let i = 0; i < N; i++) { const a = i / N * TAU; const sq = 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)), 3.2) + Math.pow(Math.abs(Math.sin(a)), 3.2), 1 / 3.2); shore.push([Math.cos(a) * sq * (440 + 16 * Math.sin(a * 7)), 0, Math.sin(a) * sq * (415 + 18 * Math.sin(a * 5 + 1)) - 90]); }
  M.set({ kind: K.PLAIN, c: 0x3a3548, layer: 0, em: 0 });
  for (let i = 0; i < N; i++) { const a = shore[i], b = shore[(i + 1) % N]; M.quad([b[0], -6, b[2]], [a[0], -6, a[2]], [a[0], 0, a[2]], [b[0], 0, b[2]], [0, 0, 1, 1], .4, .4, 1, 1); M.tri([0, 0, -90], [b[0], 0, b[2]], [a[0], 0, a[2]]); }
  /* wet ground: one big paved plate */
  M.set({ kind: K.ROAD, layer: L.CONCRETE, c: 0x2a2734, id: 2 });
  for (let i = 0; i < N; i++) { const a = shore[i], b = shore[(i + 1) % N]; M.tri([0, .04, -90], [b[0], .04, b[2]], [a[0], .04, a[2]], [0, -90], [b[0], b[2]], [a[0], a[2]]); }
  /* roads */
  const road = (x, z, w, d) => { M.set({ kind: K.ROAD, layer: L.ASPHALT, c: 0x1c1a24, id: 3 }); M.quad([x - w / 2, .1, z + d / 2], [x + w / 2, .1, z + d / 2], [x + w / 2, .1, z - d / 2], [x - w / 2, .1, z - d / 2], [(x - w / 2), (z + d / 2), (x + w / 2), (z - d / 2)]); };
  const X0 = -430, X1 = 430, Z0 = -470, Z1 = 300;
  for (const [z, w] of ROADS.ew) road(0, z, X1 - X0, w - 6);
  for (const [x, w] of ROADS.ns) { const hw = x === 0 ? 18 : w - 6; const zEnd = x === 0 ? -160 : Z0, zc = (zEnd + 258) / 2; road(x, zc, hw, 258 - zEnd); }
  /* lane marks, close to the fly-in only */
  M.set({ kind: K.PLAIN, layer: 0, c: 0xbab09a, em: 0, id: 3 });
  for (let z = 250; z > -150; z -= 9) { for (const x of [-3, 3]) M.quad([x - .08, .14, z], [x + .08, .14, z], [x + .08, .14, z - 4], [x - .08, .14, z - 4]); }
  for (const z of [262, 150, -30]) for (let x = -8; x < 8; x += 1.6) { const zz = z - 15; M.quad([x, .14, zz + 3], [x + .7, .14, zz + 3], [x + .7, .14, zz - 1.5], [x, .14, zz - 1.5]); }
  M.set({ kind: K.PLAIN, c: 0xc9a23a, id: 3 });
  for (const x of [-.25, .25]) M.quad([x - .08, .14, 250], [x + .08, .14, 250], [x + .08, .14, -150], [x - .08, .14, -150]);
  /* curbs along the avenue */
  setPlain(M, 0x4a4656);
  M.box(-9.2, 0, 54, .4, .22, 408, { crease: false }); M.box(9.2, 0, 54, .4, .22, 408, { crease: false });
}

const DRESS_R = rng(5151);
function deck(M, pts, w, o = {}) {
  const n = pts.length - 1; const rings = [];
  const fr = (i) => { const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, n)]; const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l]; };
  for (let i = 0; i <= n; i++) { const p = pts[i], s = fr(i); rings.push([[p[0] + s[0] * w / 2, p[1] - 1.5, p[2] + s[1] * w / 2], [p[0] - s[0] * w / 2, p[1] - 1.5, p[2] - s[1] * w / 2], [p[0] - s[0] * w / 2, p[1], p[2] - s[1] * w / 2], [p[0] + s[0] * w / 2, p[1], p[2] + s[1] * w / 2]]); }
  setPlain(M, o.c || 0x332f42);
  M.set({ id: M.nid() });
  for (let i = 0; i < n; i++) {
    const A = rings[i], B = rings[i + 1];
    for (const [a, b] of [[0, 1], [1, 2], [3, 0]]) { M.quad(A[a], A[b], B[b], B[a], [0, 0, 1, 1], .75, .75, 1, 1); M.quad(A[b], A[a], B[a], B[b]); }
    M.set({ kind: K.ROAD, layer: L.ASPHALT, c: 0x1a1822 }); M.quad(A[2], A[3], B[3], B[2]); setPlain(M, o.c || 0x332f42);
    /* barriers */
    M.set({ c: hex(0x4a4658) });
    for (const q of [2, 3]) { const a = A[q], b = B[q], u = [a[0], a[1] + 1.05, a[2]], v = [b[0], b[1] + 1.05, b[2]]; M.quad(a, b, v, u); M.quad(b, a, u, v); }
    setPlain(M, o.c || 0x332f42);
  }
  /* pillars, a street's clearance apart */
  const every = o.every || 6;
  for (let i = 3; i < n; i += every) { const p = pts[i]; if (Math.hypot(p[0], p[2] + 90) > 500) continue; const baseY = 0; M.box(p[0], baseY, p[2], 2.2, p[1] - 3, 2.2, { c: 0x4a4656 }); M.box(p[0], p[1] - 4, p[2], w * .8, 2.5, 2.4, { c: 0x3c384a }); if (Math.abs(p[0]) < 120 && p[2] > 90 && p[2] < 290) dressPillar(M, p[0], p[2], 2.2, p[1] - 3, DRESS_R); }
  /* lanes, barrier lights and overhead lamps near the island, so the deck is a road and not a band */
  if (o.lanes) { for (let i = 0; i < n; i++) { const A = pts[i], B = pts[i + 1]; if (Math.hypot(A[0], A[2] + 90) > 620) continue; const s = fr(i), dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2];
      for (let k = 0; k < 3; k++) { const t0 = k / 3, t1 = t0 + .15; for (const lat of [-w * .17, w * .17]) { M.set({ kind: K.PLAIN, c: hex(0x8f8a78), em: 0, layer: 0, id: 3 }); const a = [A[0] + dx * t0 + s[0] * lat, A[1] + dy * t0 + .05, A[2] + dz * t0 + s[1] * lat], b = [A[0] + dx * t1 + s[0] * lat, A[1] + dy * t1 + .05, A[2] + dz * t1 + s[1] * lat], ex = s[0] * .09, ez = s[1] * .09; M.quad([a[0] - ex, a[1], a[2] - ez], [a[0] + ex, a[1], a[2] + ez], [b[0] + ex, b[1], b[2] + ez], [b[0] - ex, b[1], b[2] - ez]); } }
      /* edge line */
      for (const e of [-w * .46, w * .46]) { M.set({ kind: K.PLAIN, c: hex(0x8a7a2a), em: 0, layer: 0, id: 3 }); const ex = s[0] * .07, ez = s[1] * .07, a = [A[0] + s[0] * e, A[1] + .05, A[2] + s[1] * e], b = [B[0] + s[0] * e, B[1] + .05, B[2] + s[1] * e]; M.quad([a[0] - ex, a[1], a[2] - ez], [a[0] + ex, a[1], a[2] + ez], [b[0] + ex, b[1], b[2] + ez], [b[0] - ex, b[1], b[2] - ez]); }
      /* lamp every other span, red and amber reflectors on the barrier */
      if (i % 2 === 0) { const lat = (i % 4 ? 1 : -1) * w * .5, lx = A[0] + s[0] * lat, lz = A[2] + s[1] * lat; setPlain(M, 0x262432); M.cyl(lx, A[1], lz, .12, .08, 8, 4, { c: 0x262432, top: false }); const hx = A[0] + s[0] * lat * .55, hz = A[2] + s[1] * lat * .55; M.beam([lx, A[1] + 8, lz], [hx, A[1] + 8.2, hz], .1, { c: 0x262432 }); M.set({ kind: K.PLAIN, c: hex(0xffd090), em: 255, layer: 0 }); M.box(hx, A[1] + 8, hz, .5, .06, .5, {}); M.set({ em: 0 }); glow(hx, A[1] + 7.8, hz, 0xffb060, 5); pool(hx, hz, 16, 0xffa860, .55); }
      M.set({ kind: K.NEON, c: hex(i % 3 ? 0xff2a2a : 0xffb030), seed: 0 }); for (const e of [-w * .5, w * .5]) { const lx = A[0] + s[0] * e, lz = A[2] + s[1] * e; M.box(lx, A[1] + 1.1, lz, .25, .1, .25, {}); }
      setPlain(M, o.c || 0x332f42);
    } }
  /* lit strip along the side */
  if (o.neon) for (let i = 0; i < n; i += 1) { if (i % 2) continue; const a = rings[i][3], b = rings[i + 1][3]; M.set({ kind: K.NEON, c: hex(o.neon), seed: 0 }); M.quad([a[0], a[1] - .5, a[2]], [b[0], b[1] - .5, b[2]], [b[0], b[1] - .3, b[2]], [a[0], a[1] - .3, a[2]]); M.quad([b[0], b[1] - .5, b[2]], [a[0], a[1] - .5, a[2]], [a[0], a[1] - .3, a[2]], [b[0], b[1] - .3, b[2]]); setPlain(M, 0x332f42); }
}

function bridge(M, R) {
  deck(M, BRIDGE, 14, { neon: PAL.red, every: 999, c: 0x3a3548 });
  const n = BRIDGE.length - 1;
  /* piers down to the water, two big pylons with stays */
  for (let i = 2; i < n; i += 4) { const p = BRIDGE[i]; if (p[2] < 250) continue; setPlain(M, 0x3c384a); M.box(p[0], -2, p[2], 3.4, p[1] - 3, 6, {}); M.box(p[0], p[1] - 5, p[2], 18, 3.4, 6, { c: 0x34303f }); }
  for (const i of [22, 42]) {
    const p = BRIDGE[i], q = BRIDGE[i + 1], dx = q[0] - p[0], dz = q[2] - p[2], l = Math.hypot(dx, dz), sx = -dz / l, sz = dx / l, H = 120;
    for (const s of [-1, 1]) { setPlain(M, 0x4a4656); M.beam([p[0] + sx * s * 9, -2, p[2] + sz * s * 9], [p[0] + sx * s * 4, p[1] + H, p[2] + sz * s * 4], 3, { c: 0x45414f }); neonStrip(M, p[0] + sx * s * 5, p[1] + H - 8, p[2] + sz * s * 5, .5, 8, .5, PAL.red, 0); }
    glow(p[0], p[1] + H + 3, p[2], PAL.red, 22, 1);
    M.box(p[0], p[1] + H - 16, p[2], Math.abs(sx) * 9 + 3, 3, Math.abs(sz) * 9 + 3, { c: 0x3a3644 });
    for (let k = -5; k <= 5; k++) { if (!k) continue; const j = clamp(Math.round(i + k * 1.2), 0, n); const r = BRIDGE[j]; for (const s of [-1, 1]) M.beam([p[0] + sx * s * 4, p[1] + H * (.5 + .1 * Math.abs(k)), p[2] + sz * s * 4], [r[0] + sx * s * 6.5, r[1], r[2] + sz * s * 6.5], .16, { c: 0x6a6476 }); }
  }
  for (let i = 3; i < n; i += 4) { const p = BRIDGE[i]; glow(p[0], p[1] + 5, p[2], PAL.orange, 12); }
}
/* boats, a working barge and a pier so the water has near layers */
function harbour(M, R) {
  const boat = (x, z, ry, L0, c) => { M.at(x, -2, z, ry, () => { const w = L0 * .24; setPlain(M, c); const a = [[-w * .7, 0, -L0 / 2], [w * .7, 0, -L0 / 2], [w * .25, 0, L0 / 2], [-w * .25, 0, L0 / 2]], b = [[-w, 1.6, -L0 / 2], [w, 1.6, -L0 / 2], [w * .1, 2.2, L0 * .62], [-w * .1, 2.2, L0 * .62]]; M.loft([a, b], { c }); M.loft([b, b.map(() => [0, 1.6, 0])], { c: mixC(c, 0xffffff, .2) }); M.box(0, 1.6, -L0 * .12, w * 1.1, 2.6, L0 * .34, { c: 0x6a6670 }); M.set({ kind: K.PLAIN, em: 230, c: hex(0xffd08a) }); M.box(0, 2.9, -L0 * .12, w * 1.16, .7, L0 * .3, {}); M.set({ em: 0 }); }); glow(x, 1, z, R.pick([0xffd08a, PAL.cyan, PAL.magenta]), 12); };
  for (let i = 0; i < 16; i++) { const bx = R.range(-120, 380), bz = R.range(325, 440), by = R.range(-1, 1) + (i % 2 ? Math.PI : 0), bl = R.range(12, 26), bc = R.pick([0x7a2a3a, 0x24384a, 0xb09a78, 0x2a4a44, 0x3a2a4a]); if (Math.abs(bx - 30) > 130) boat(bx, bz, by, bl, bc); }
  /* container barge */
  { const x = 170, z = 470; M.at(x, -2, z, .25, () => { setPlain(M, 0x2a2838); M.box(0, 0, 0, 130, 5, 26, { c: 0x2a2838 }); for (let i = 0; i < 11; i++) for (let j = 0; j < 3; j++) { let y = 5; const n = R.int(1, 3); for (let k = 0; k < n; k++) { M.box(-52 + i * 10.4, y, -8 + j * 8, 9.8, 3, 7, { c: R.pick([0xb03a3a, 0x2a6a7a, 0xc99a3a, 0x7a7684, 0x3a5a3a, 0xa04a8a]) }); y += 3; } } M.box(58, 5, 0, 12, 12, 20, { c: 0xd8cfc0 }); M.set({ kind: K.PLAIN, em: 230, c: hex(0xffe0a0) }); M.box(52, 14, 0, .3, 2, 16, {}); M.set({ em: 0 }); }); glow(x + 62, 22, z - 12, PAL.red, 14, 1); glow(x - 60, 10, z + 14, 0xffd08a, 18); }
  /* pier with lamps */
  setPlain(M, 0x3a3548); M.box(-38, -2, 335, 11, 3.4, 110, { c: 0x4a4656 }); for (let z = 290; z < 392; z += 12) { M.cyl(-43, 0, z, .2, .16, 8, 4, { c: 0x201e2a, top: false }); M.cyl(-33, 0, z, .2, .16, 8, 4, { c: 0x201e2a, top: false }); glow(-43, 8, z, 0xffc47a, 7); glow(-33, 8, z, 0xffc47a, 7); }
  /* waterfront neon on the quay */
  for (let i = 0; i < 5; i++) blade(M, 110 + i * 32, 12, 301, 0, 16, 3 + i * 7, R);
}
function megatower(M) {
  const R = rng(1984); const cx = 0, cz = -235; const seed = 88;
  const rings = [[92, 92, 0, 112], [74, 74, 112, 218], [58, 58, 218, 334], [42, 42, 334, 446], [26, 26, 446, 540]];
  M.set({ kind: K.FACADE, em: 74, seed, a: 0, layer: 0 });
  for (const [w, d, y0, y1] of rings) {
    const p = chamferPoly(cx, cz, w, d, w * .17);
    M.set({ kind: K.FACADE, em: y1 > 400 ? 92 : 70, seed, a: 0 });
    M.extrude(p, y0, y1, { c: 0x1b2442, grad: .7, topc: 0x262e4a });
    setPlain(M, 0x394366);
    M.extrude(chamferPoly(cx, cz, w + 2.4, d + 2.4, w * .17), y1 - 3.6, y1, { topc: 0x2a3250, grad: .9 });
    neonStrip(M, cx, y1 - 4.2, cz + d / 2 + 1.25, w * .62, .55, .2, PAL.cool, 0);
    neonStrip(M, cx + w / 2 + 1.25, y1 - 4.2, cz, .2, .55, d * .62, PAL.cool, 0);
    neonStrip(M, cx - w / 2 - 1.25, y1 - 4.2, cz, .2, .55, d * .62, PAL.cool, 0);
    /* corner fins with a thin light line */
    setPlain(M, 0x303a5a);
    const hh = y1 - y0;
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const fx = cx + sx * (w / 2 - w * .085), fz = cz + sz * (d / 2 - w * .085);
      M.rbox(fx + sx * .9, y0, fz + sz * .9, 2.4, hh - 2, 2.4, Math.PI / 4, {});
    }
    for (const sx of [-.22, .22]) { M.box(cx + sx * w, y0, cz + d / 2 + .5, 1.1, hh - 4, 1, { c: 0x2c3556 }); neonStrip(M, cx + sx * w, y0 + 2, cz + d / 2 + 1.05, .16, hh - 8, .1, y0 > 300 ? PAL.cool : 0x88b8ff, 0); }
  }
  /* crown: stepped chamfers narrowing to one needle */
  const cr = [[20, 540, 556], [14, 556, 574], [8.5, 574, 596]];
  for (const [w, y0, y1] of cr) { setPlain(M, 0x28304c); M.extrude(chamferPoly(cx, cz, w, w, w * .28), y0, y1, { topc: 0x3a456a }); neonStrip(M, cx, y1 - .8, cz + w / 2 + .1, w * .5, .5, .2, PAL.cool, 0); neonStrip(M, cx + w / 2 + .1, y1 - .8, cz, .2, .5, w * .5, PAL.cool, 0); }
  M.cyl(cx, 596, cz, 1.3, .12, 82, 6, { c: 0x4a5478 });
  glow(cx, 678, cz, PAL.cool, 42); glow(cx, 640, cz, PAL.red, 18, 1);
  for (const [sx, sz] of [[-1, 1], [1, 1]]) glow(cx + sx * 10, 540, cz + sz * 10, PAL.red, 15, 1);
  for (const y of [112, 218, 334, 446]) { glow(cx, y, cz + 40, PAL.cool, 26); }
  glow(cx, 590, cz, 0xcfe6ff, 70);
  /* a podium with a plaza */
  setPlain(M, 0x2a2c40, L.MARBLE);
  M.box(cx, 0, cz, 128, 1.2, 128, { uvS: .05, topc: 0x3a3c52 });
  M.set({ kind: K.FACADE, em: 70, seed: 34, a: 2, layer: 0 }); M.extrude(chamferPoly(cx, cz, 108, 108, 20), 1.2, 16, { c: 0x2a3044 });
  /* four terraces step back from the avenue, each with its own lit band and street of signs */
  for (const [w, y0, y1, em] of [[100, 18, 40, 64], [92, 40, 66, 58], [84, 66, 88, 52], [78, 88, 112, 46]]) { M.set({ kind: K.FACADE, em, seed: 34 + y0, a: 4, layer: 0 }); M.extrude(chamferPoly(cx, cz, w, w, 16), y0, y1, { c: 0x3a4058, topc: 0x24283a, grad: .7 }); setPlain(M, 0x4a5272); M.extrude(chamferPoly(cx, cz, w + 2, w + 2, 16), y1 - 1.2, y1, { topc: 0x2a3050, grad: .9 }); neonStrip(M, cx, y1 - 1.7, cz + w / 2 + 1.1, w * .54, .22, .12, y0 < 50 ? PAL.yellow : PAL.cool, 0); }
  for (let i = 0; i < 7; i++) blade(M, cx - 24 + i * 8, 26 + (i % 3) * 7, cz + 51, Math.PI / 2, R.range(9, 15), i * 5 + 3, R);
  setPlain(M, 0x3a4464); M.extrude(chamferPoly(cx, cz, 112, 112, 20), 16, 18, { topc: 0x2a3050 });
  /* giant lit banner, no emblem */
  adRig(M, cx - 8, 164, cz + 37, 0, 26, 38, R, { off: 2.2 });
  pool(cx, cz + 75, 66, PAL.cool, .4);
}

function megablock(M) {
  const R = rng(777);
  const slabs = [[-330, -10, 80, 34, 262], [-225, 42, 84, 30, 218], [-330, 112, 74, 34, 196]];
  for (const [x, z, w, d, h] of slabs) {
    const base = 0xaaa4ac, seed = R() * 255;
    M.set({ kind: K.FACADE, em: 104, seed, a: 4, layer: 0 });
    M.extrude(rectPoly(x, z, w, d), 0, h, { c: base, grad: .66, topc: 0x45414f });
    /* balconies: a thin slab each floor per long face, some with junk */
    const fl = 6.2;
    for (let y = 14; y < h - 6; y += fl) {
      for (const sgn of [1, -1]) {
        const c = R.chance(.25) ? 0x66626f : 0x5a5664;
        M.set({ kind: K.PLAIN, em: 0, layer: 0 }); M.box(x, y, z + sgn * (d / 2 + .9), w - 2, .36, 1.8, { c, crease: false, bot: true });
        setPlain(M, 0x3a3644); M.box(x, y + .36, z + sgn * (d / 2 + 1.76), w - 2, 1, .08, { crease: false, bot: false, top: false });
        const nb = 4;
        for (let i = 0; i < nb; i++) {
          const bx = x + R.range(-w / 2 + 3, w / 2 - 3), bz = z + sgn * (d / 2 + R.range(.5, 1.4)), t = R();
          if (t < .35) { M.box(bx, y + .36, bz, 1.1, .85, .55, { c: 0x4c4a58 }); }
          else if (t < .6) { const lc = R.pick([0xb9b2c4, 0xc05a8a, 0x5aa2b0, 0xd0a040, 0x8a6bc0]); M.set({ c: hex(lc), kind: K.PLAIN, id: M.nid() }); const q = [[bx - 1, y + 2.5, bz], [bx + 1, y + 2.5, bz], [bx + 1, y + 1.2, bz], [bx - 1, y + 1.2, bz]]; M.quad(q[0], q[1], q[2], q[3]); M.quad(q[3], q[2], q[1], q[0]); }
          else if (t < .8) { M.cyl(bx, y + .36, bz, .22, .28, .5, 5, { c: 0x4a3a2a }); M.blob(bx, y + 1, bz, .5, { c: 0x234a33, r: R }); }
        }
      }
    }
    /* end walls: big ads and pipes */
    if (h !== 196) adRig(M, x + w / 2, h * .36, z, Math.PI / 2, 20, 28, R);
    for (let i = 0; i < 6; i++) { M.cyl(x - w / 2 + 6 + i * 12, 0, z + d / 2 + 2.3, .32, .32, h, 4, { c: 0x4a4656, top: false }); }
    roofClutter(M, rectPoly(x, z, w, d), h, R, 14);
    M.cyl(x + w * .25, h, z, 6, 6, 9, 8, { c: 0x5a5664 }); M.cyl(x + w * .25, h + 9, z, 6.6, .6, 3.2, 8, { c: 0x3a3644 });
    M.cyl(x - w * .3, h, z, .3, .12, 30, 4, { c: 0x30303e }); glow(x - w * .3, h + 30, z, PAL.red, 9, 1);
    /* kitsch shops at the foot */
    for (let i = 0; i < 6; i++) front(M, x - w / 2 + 7 + i * (w - 12) / 5, z + d / 2 + 2.6, 11, 0, R);
    for (let i = 0; i < 5; i++) blade(M, x - w / 2 + 6 + i * (w - 12) / 4, 14 + (i % 3) * 8, z + d / 2 + 3.4, Math.PI / 2, R.range(8, 14), i * 3 + 7, R);
    pool(x, z + d / 2 + 20, 46, R.pick([PAL.magenta, PAL.cyan]), .5);
    /* his one warm window, near the top */

  }
  /* skybridges */
  setPlain(M, 0x4e4a5a);
  M.box(-280, 130, 16, 44, 6, 9, {}); M.box(-280, 86, 16, 44, 5, 8, {}); M.box(-280, 96, 78, 46, 6, 10, {});
  M.set({ kind: K.FACADE, em: 180, seed: 12, a: 1 }); M.box(-280, 131, 20.6, 40, 4, .2, { c: 0x1a2030, top: false, bot: false });
}

function castle(M) {
  const R = rng(55); const cx = -212, cz = 296;
  setPlain(M, 0x22402f);
  /* the point, gardens and forest */
  M.lathe(cx, -6, cz, [[108, 0], [100, 6], [92, 9], [40, 12], [0, 13]], 14, { c: 0x22402f, sq: .85, grad: .55 });
  for (let i = 0; i < 44; i++) { const a = R() * TAU, r = R.range(50, 96), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r * .85; if (z > cz + 40 && Math.abs(x - cx) < 24) continue; if (x > cx + 30 && Math.abs(z - (cz - 4)) < 16) continue;   /* the flight into the study hall comes in low here */ M.blob(x, 10, z, R.range(3.5, 7.5), { c: R.pick([0x133528, 0x173d30, 0x0f2c24]), r: R, sy: 1.25 }); }
  const st = 0x6a6578;
  const seed = 20;
  M.set({ kind: K.FACADE, em: 90, seed, a: 6 }); M.extrude(rectPoly(cx, cz, 68, 26), 7, 30, { c: st, topc: 0x2e3040 });
  M.extrude(rectPoly(cx + 26, cz + 16, 22, 22), 7, 28, { c: st, topc: 0x2e3040 });
  setPlain(M, 0x2e3040); M.loft([rectPoly(0, 0, 66, 24).map(p => [cx + p[0], 30, cz + p[1]]), rectPoly(0, 0, 54, 6).map(p => [cx + p[0], 40, cz + p[1]])], { c: 0x2e3040 });
  /* round tower with battlements */
  M.set({ kind: K.FACADE, em: 90, seed, a: 6 }); M.cyl(cx - 38, 7, cz + 6, 12, 11, 58, 12, { c: st, top: false });
  M.cyl(cx - 38, 65, cz + 6, 13, 13, 3, 12, { c: 0x5e5a6c }); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; M.box(cx - 38 + Math.cos(a) * 12.4, 68, cz + 6 + Math.sin(a) * 12.4, 2.6, 2.4, 2.6, { c: 0x5e5a6c }); }
  for (let i = 0; i < 16; i++) { setPlain(M, 0x5e5a6c); M.box(cx - 32 + i * 4.2, 30, cz + 13.4, 2, 2, 1, {}); }
  M.cyl(cx - 38, 70, cz + 6, 8, .3, 12, 8, { c: 0x41685c });
  glow(cx + 2, 18, cz + 16, 0x5be38a, 28); pool(cx + 2, cz + 34, 38, 0x5be38a, .35);
}

/* the room's chalet (CH) as the city sees it: a stone base down the slope, timber walls, a steep snowy roof with its ridge along x,
   and the +X gable end glazed and lit over a deck. The glass is one quad facing out; close to, the hole shows the room (CR) */
function chalet(M) {
  const id0 = M._id, cur0 = M.id;
  const { x, z, y } = CH, top = y + 2.85, rh = 3.3, gx = x + 4.5, bx = x - 5.1, zN = z - 3.8, zS = z + 3.8;
  /* a level snowy pad for it to stand on, its sides falling away under the valley floor; the mountain's id (7), so no ink line round it */
  { const r0 = rectPoly(x + .6, z, 16, 13), r1 = rectPoly(x + .6, z, 44, 40), yt = y - .95;
    M.set({ kind: K.SNOW, c: [.66, .7, .86], em: 0, layer: 0 }); M.id = 7; M.loft([r1.map(p => [p[0], y - 16, p[1]]), r0.map(p => [p[0], yt, p[1]])], { grad: .9 });
    M.quad([x - 7.4, yt, z + 6.5], [x + 8.6, yt, z + 6.5], [x + 8.6, yt, z - 6.5], [x - 7.4, yt, z - 6.5], [0, 0, 1, 1]); }
  /* a stone plinth showing above the snow */
  setPlain(M, 0x4f4d58); M.extrude(rectPoly(x - .3, z, 9.8, 7.8), y - 1.0, y - .05, { top: false });
  /* timber walls, a dark sill band */
  setPlain(M, 0x5a3a26); M.extrude(rectPoly(x - .3, z, 9.6, 7.6), y - .05, top, { top: false });
  setPlain(M, 0x2e1e14); M.box(x - .3, y - .3, z, 9.7, .32, 7.7, { bot: false });
  /* the gable triangles, timber, each end; a small lit window high in the glass end */
  setPlain(M, 0x5a3a26); M.id = M.nid(); M.tri([gx, top, zS], [gx, top, zN], [gx, top + rh, z]); M.tri([bx, top, zN], [bx, top, zS], [bx, top + rh, z]);
  M.set({ kind: K.PLAIN, c: hex(0xd8a868), em: 70 }); M.id = M.nid(); M.tri([gx + .03, top + .7, z + .6], [gx + .03, top + .7, z - .6], [gx + .03, top + 1.5, z]); M.set({ em: 0 });
  /* the roof: two snowy slopes, timber under the eaves, past the glass over the deck */
  { const xa = bx - .5, xb = gx + 1.4, s = rh / 3.8, yE = top - .8 * s, yR = top + rh, za = zN - .8, zb = zS + .8;
    setPlain(M, 0xcdd6ea); M.id = M.nid(); M.quad([xa, yE, za], [xa, yR, z], [xb, yR, z], [xb, yE, za]); M.quad([xa, yE, zb], [xb, yE, zb], [xb, yR, z], [xa, yR, z]);
    setPlain(M, 0x3a2618); M.id = M.nid(); M.quad([xa, yE - .02, za], [xb, yE - .02, za], [xb, yR - .02, z], [xa, yR - .02, z]); M.quad([xa, yE - .02, zb], [xa, yR - .02, z], [xb, yR - .02, z], [xb, yE - .02, zb]);
    setPlain(M, 0xdfe6f4); for (const ze of [za, zb]) M.box((xa + xb) / 2, yE - .22, ze, xb - xa, .24, .22, {});
    setPlain(M, 0x2e1e14); for (const ze of [za, zb]) M.beam([xb, yE - .1, ze], [xb, yR + .05, z], .2, {});
    /* the stove's chimney, stone, through the left slope by the glass */
    setPlain(M, 0x4f4d58); M.box(x + 2.9, top + .2, z - 2.3, .8, rh + .3, .8, {}); setPlain(M, 0x2a2830); M.box(x + 2.9, top + rh + .5, z - 2.3, 1, .14, 1, {}); }
  /* the glass, lit from inside, one quad facing out */
  M.set({ kind: K.PLAIN, c: hex(0xe0a868), em: 110, a: 0 }); M.id = M.nid(); M.quad([gx + .03, y + .02, z + 3], [gx + .03, y + .02, z - 3], [gx + .03, y + 2.6, z - 3], [gx + .03, y + 2.6, z + 3]); M.set({ em: 0 });
  /* the deck in front of it, on posts down the slope, a railing */
  setPlain(M, 0x6a4a30); M.box(gx + 1.2, y - .28, z, 2.4, .24, 7.6, {});
  setPlain(M, 0x2e1e14); for (const zz of [z - 3.4, z + 3.4]) M.box(gx + 2.15, y - .95, zz, .26, .7, .26, {});
  setPlain(M, 0x3a2618); M.box(gx + 2.3, y + .92, z, .1, .08, 7.7, {}); for (let k = -3; k <= 3; k++) M.box(gx + 2.3, y - .05, z + k * 1.25, .07, .98, .07, {});
  for (const zz of [zN + .05, zS - .05]) M.box(gx + 1.15, y + .92, zz, 2.3, .08, .1, {});
  /* the door on the uphill side, a lamp by it */
  setPlain(M, 0x2e1e14); M.id = M.nid(); M.quad([x - 2.3, y, zN - .03], [x - 3.3, y, zN - .03], [x - 3.3, y + 2.1, zN - .03], [x - 2.3, y + 2.1, zN - .03]);
  M.set({ kind: K.PLAIN, c: hex(0xffc37a), em: 200 }); M.box(x - 1.95, y + 2.1, zN - .1, .14, .2, .1, {}); M.set({ em: 0 });
  glow(gx + .8, y + 1.5, z, 0xffb060, 13); glow(x - 1.95, y + 2.2, zN - .4, 0xffc37a, 4);
  pool(gx + 4, z, 10, 0xffb060, .45);
  M._id = id0; M.id = cur0;
}
function mountain(M) {
  const R = rng(99); const { cx, W } = MTN; const NX = 122, NZ = 64, Z0 = -1510, Z1 = -620;
  const ht = mtnH, gy = (x, z) => ht(x, z) - 2;
  const P = (i, j) => { const x = cx - W / 2 + W * i / NX + ((j % 2) ? W / NX / 2 : 0), z = Z0 + (Z1 - Z0) * j / NZ; return [x, ht(x, z) - 2, z]; };
  M.set({ kind: K.SNOW, layer: 0, em: 0, id: 7 });
  /* smooth normals, from the height around each corner, so the snow, the rock and the light follow the ground, not the triangles */
  const nrm = p => { const e = 9, dx = (ht(p[0] + e, p[2]) - ht(p[0] - e, p[2])) / (2 * e), dz = (ht(p[0], p[2] + e) - ht(p[0], p[2] - e)) / (2 * e), l = Math.hypot(dx, 1, dz); return [-dx / l, 1 / l, -dz / l]; };
  const st = (a, b, c) => { M.vx(a, nrm(a), 0, 0); M.vx(b, nrm(b), 0, 0); M.vx(c, nrm(c), 0, 0); };
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = P(i, j + 1), b = P(i + 1, j + 1), c = P(i + 1, j), d = P(i, j); st(a, b, c); st(a, c, d); }
  /* the village on the valley floor */
  const vx = SKI.vil.x, vz = SKI.vil.z, [gbx, gbz] = SKI.gBase, [gtx, gtz] = SKI.gTop, [c0, c1] = SKI.chair;
  /* anything random that would stand in the chalet, or on a lift station, is drawn into a throwaway builder, so the random sequence, and the rest of the village and forest, is unchanged */
  const TRASH = new MB(4000), via = (B, fn) => { if (B !== TRASH) return fn(); TRASH._id = M._id; fn(); M._id = TRASH._id; }, inCH = (x, z, hw = 0, hd = 0) => Math.abs(x - (CH.x + .6)) < 8.4 + hw && Math.abs(z - CH.z) < 6.9 + hd;
  /* the chalet's front yard, east of its glass, kept clear of trees and houses so the view opens onto the far slope and its forest */
  const inView = (x, z) => x > CH.x && x < CH.x + 55 && Math.abs(z - CH.z) < 20 + (x - CH.x) * .35;
  const onLift = (x, z, r) => Math.hypot(x - gbx, z - gbz) < 22 + r || Math.hypot(x - c0[0], z - c0[1]) < 10 + r;
  for (let i = 0; i < 26; i++) { const x = vx + R.range(-40, 40), z = vz + R.range(-52, 56); const y = gy(x, z), w = R.range(9, 17), d = R.range(8, 13), h = R.range(5, 10), B = inCH(x, z, w / 2 + .8, d / 2 + .8) || onLift(x, z, w / 2) || inView(x, z) ? TRASH : M;
    via(B, () => { B.set({ kind: K.FACADE, em: 130, seed: R() * 255, a: 3 }); B.extrude(rectPoly(x, z, w, d), y - 1.5, y + h, { c: R.pick([0xc0568a, 0xc9a23a, 0x8a5a3a, 0x7a4a34, 0x4f9f92]), top: false });
    setPlain(B, 0xcdd6ea); B.loft([rectPoly(x, z, w + 1.6, d + 1.6).map(p => [p[0], y + h, p[1]]), rectPoly(x, z, w + 1, .6).map(p => [p[0], y + h + d * .5, p[1]])], { c: 0xcdd6ea, grad: .7 }); });
    if (R.chance(.5)) { const c = R.pick([0xff6fae, 0xf7e84a, 0xff9a3c]); if (B === M) glow(x, y + h * .5, z + d / 2 + 1, c, 12); }
  }
  chalet(M);
  /* the gondola: a rounded hall at the top of the village, the cable up the west shoulder to the top station */
  const gby = gy(gbx, gbz), gty = gy(gtx, gtz);
  M.set({ kind: K.FACADE, em: 160, seed: 77, a: 3 }); M.extrude(roundPoly(gbx, gbz, 34, 20, 9, 3), gby - 2, gby + 14, { c: 0xc0568a, topc: 0xc9a23a });
  neonStrip(M, gbx, gby + 14.2, gbz + 10.2, 22, .5, .3, 0xff6fae, 0);
  const cA = [gbx - 6, gby + 20, gbz - 8], cB = [gtx + 6, gty + 16, gtz + 6];
  M.beam(cA, cB, .35, { c: 0x201c2c });
  /* towers only where the ground comes up to the line: over the valley it is one long span, as the big cars run */
  for (let i = 1; i < 12; i++) { const t = i / 12, q = [lerp(cA[0], cB[0], t), lerp(cA[1], cB[1], t), lerp(cA[2], cB[2], t)], y0 = gy(q[0], q[2]); if (q[1] - y0 < 4 || q[1] - y0 > 40) continue; M.box(q[0], y0 - 2, q[2], 1.4, q[1] - y0 + 4, 1.4, { c: 0x2c2838 }); M.box(q[0], q[1] + 1, q[2], 7, .8, 1.4, { c: 0x2c2838 }); }
  for (let i = 0; i < 10; i++) { const t = (i + .5) / 10, q = [lerp(cA[0], cB[0], t), lerp(cA[1], cB[1], t) - 5, lerp(cA[2], cB[2], t)]; setPlain(M, i % 2 ? 0xc9a23a : 0xc0568a); M.box(q[0], q[1], q[2], 3.4, 3.4, 4.6, {}); M.set({ kind: K.PLAIN, em: 255, c: hex(0xffe0a0) }); M.box(q[0], q[1] + 1.4, q[2] + 2.31, 2.6, 1, .05, {}); M.set({ em: 0 }); glow(q[0], q[1] + 1.6, q[2], 0xffc080, 9); }
  /* the top station: a hall dug into the shoulder, a restaurant with lit glass and a terrace over the valley */
  M.set({ kind: K.FACADE, em: 160, seed: 91, a: 3 }); M.extrude(roundPoly(gtx, gtz, 28, 18, 6, 3), gty - 14, gty + 12, { c: 0x4f4d58, topc: 0x2e3040 });
  M.set({ kind: K.FACADE, em: 200, seed: 141, a: 3 }); M.extrude(rectPoly(gtx + 16, gtz + 8, 18, 12), gty - 10, gty + 7, { c: 0x5a3a26, topc: 0xcdd6ea });
  setPlain(M, 0x6a4a30); M.box(gtx + 16, gty - .2, gtz + 17, 20, .5, 7, {});
  setPlain(M, 0x3a2618); for (let k = 0; k < 9; k++) M.box(gtx + 7 + k * 2.3, gty - .2, gtz + 20.4, .14, 1.2, .14, {});
  neonStrip(M, gtx + 16, gty + 7.2, gtz + 14.1, 14, .45, .3, 0xffc37a, 3);
  glow(gtx + 16, gty + 3, gtz + 16, 0xffc37a, 18); glow(gtx, gty + 13, gtz, 0xff6fae, 10); pool(gtx + 10, gtz + 14, 30, 0xffb060, .35);
  /* the chairlift up the east side: huts at each end, towers, two lines of chairs */
  { const dx = c1[0] - c0[0], dz = c1[1] - c0[1], L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, px = -uz, pz = ux, n = Math.ceil(L / 34), tops = [];
    for (const [x, z] of [c0, c1]) { const y = gy(x, z); setPlain(M, 0x3a2618); M.box(x, y - 1, z, 9, 6, 7, {}); setPlain(M, 0xcdd6ea); M.box(x, y + 5, z, 10, .5, 8, {}); M.set({ kind: K.PLAIN, em: 200, c: hex(0xffc37a) }); M.box(x + px * 3.6, y + 1.5, z + pz * 3.6, 3, 1.2, .1, {}); M.set({ em: 0 }); glow(x, y + 4, z, 0xffc37a, 8); }
    for (let k = 0; k <= n; k++) { const t = k / n, x = c0[0] + dx * t, z = c0[1] + dz * t, y0 = gy(x, z), y = y0 + 9; tops.push([x, y, z]);
      if (k > 0 && k < n) { setPlain(M, 0x2c2838); M.box(x, y0 - 1, z, .7, 10, .7, {}); } setPlain(M, 0x2c2838); M.box(x, y - .2, z, Math.abs(px) * 5 + .4, .4, Math.abs(pz) * 5 + .4, {}); }
    for (const s of [-2.3, 2.3]) for (let k = 0; k < n; k++) { const a = tops[k], b = tops[k + 1], o = [px * s, 0, pz * s]; M.beam([a[0] + o[0], a[1], a[2] + o[2]], [b[0] + o[0], b[1], b[2] + o[2]], .08, { c: 0x201c2c });
      for (let q = .15; q < 1; q += .3) { const x = lerp(a[0], b[0], q) + o[0], y = lerp(a[1], b[1], q), z = lerp(a[2], b[2], q) + o[2]; setPlain(M, 0x2c2838); M.box(x, y - 2.2, z, .08, 2.2, .08, {}); setPlain(M, s < 0 ? 0xc0568a : 0x4f9f92); M.box(x, y - 2.6, z, 1.7, .45, .8, {}); M.box(x - ux * .35, y - 2.2, z - uz * .35, 1.7, .7, .12, {}); } } }
  /* far spruce over the lower slopes */
  for (let i = 0; i < 70; i++) { const x = vx + R.range(-500, 480), z = vz + R.range(-180, 120); const y = gy(x, z); if (y > 220) continue; if (Math.hypot(x - vx, z - vz) < 70 || skiPiste(x, z) > .2 || inView(x, z)) continue; const B = inCH(x, z, 4, 4) ? TRASH : M; via(B, () => pine(B, x, y, z, R.range(10, 19), R)); }
  /* spruce close round the chalet and the village, in stands, clear of the pistes, the lifts and the buildings: their own random
     sequence, so nothing else moves */
  { const T = rng(4242), seg = (x, z, a, b) => { const bx = b[0] - a[0], bz = b[2] - a[2], t = clamp(((x - a[0]) * bx + (z - a[2]) * bz) / (bx * bx + bz * bz)); return Math.hypot(x - a[0] - bx * t, z - a[2] - bz * t); };
    const ch0 = [c0[0], 0, c0[1]], ch1 = [c1[0], 0, c1[1]];
    for (let i = 0; i < 1300; i++) { const x = T.range(CH.x - 130, vx + 240), z = T.range(vz - 200, CH.z + 90), y = gy(x, z);
      if (y > 285 || y < 4 || inCH(x, z, 8, 8) || inView(x, z) || Math.abs(x - vx) < 52 && Math.abs(z - vz) < 66 || onLift(x, z, 6) || Math.hypot(x - gtx, z - gtz) < 30 || seg(x, z, cA, cB) < 9 || seg(x, z, ch0, ch1) < 7 || skiPiste(x, z) > .2) continue;
      if (Math.sin(x * .031 + 1.2) * Math.sin(z * .027) + T() * .8 < -.1) continue;
      pine(M, x, y - .5, z, T.range(9, 17), T); } }
  /* village string lights */
  for (let i = 0; i < 26; i++) { const x = vx + R.range(-44, 44), z = vz + R.range(-56, 60), c = R.pick([0xff6fae, 0xf7e84a, 0xffc080]); if (!inCH(x, z) && !onLift(x, z, 0)) glow(x, gy(x, z) + 7, z, c, 7); }
  pool(vx, vz, 90, 0xff6fae, 0);
}

function market(M, R) {
  /* low rounded fronts packed around an alley, tarps, lanterns, stacked blades */
  const cx = 195, cz = 95;
  for (let i = 0; i < 16; i++) {
    const x = 148 + (i % 4) * 26 + R.range(-3, 3), z = 22 + Math.floor(i / 4) * 26 + (i % 2) * 2, w = R.range(16, 22), d = R.range(16, 22), h = R.range(11, 34);
    tower(M, x, z, w, d, h, 'kitsch', R, { segs: R.int(1, 2) });
    for (let k = 0; k < 2; k++) blade(M, x + w / 2 + .5, h * R.range(.45, .85), z + (k - .5) * d * .6, Math.PI / 2 * 0 + (R.chance(.5) ? 0 : 0), R.range(5, 11), R.int(0, 40), R);
  }
  /* stalls on the waterfront blocks */
  carPark(M, 146, 172, 3, 13, R);
  setPlain(M, 0x2a2830); M.box(205, 0, 164, 120, .2, 3, {});
  for (let i = 0; i < 0; i++) {
    const x = 142 + R.range(0, 110), z = 170 + R.range(0, 66), w = R.range(4, 7), d = R.range(3, 5);
    setPlain(M, 0x241c28); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) M.box(x + sx * w / 2, 0, z + sz * d / 2, .16, 3, .16, {});
    M.box(x, 0, z, w * .9, 1, d * .4, { c: 0x4a3a2a });
    const ac = R.pick([0xa83a4a, 0xc99a3a, 0x2a7a7a, 0x7a3a8a, 0xd06a30]); setPlain(M, ac);
    M.loft([rectPoly(0, 0, w + .9, d + .9).map(p => [x + p[0], 3, z + p[1]]), rectPoly(0, 0, w * .3, d * .3).map(p => [x + p[0], 4, z + p[1]])], { c: ac });
    const lc = R.pick([PAL.pink, PAL.yellow, PAL.pink, PAL.orange]);
    for (let k = 0; k < 3; k++) { M.set({ kind: K.PLAIN, c: hex(lc), em: 255, layer: 0 }); M.blob(x + R.range(-w / 2, w / 2), 2.6, z + d / 2 + .3, .28, { sy: 1.15, r: R }); M.set({ em: 0 }); glow(x, 2.8, z + d / 2, lc, 6); }
    pool(x, z, 12, lc, .4);
  }
  /* kitsch taller row and big signs */
  for (let i = 0; i < 6; i++) { const x = 145 + i * 20, z = 158 - (i % 2) * 2; }
  setPlain(M, 0x2a2a32); M.box(206, 0, 152.4, 1.4, 58, 1.4, {}); adRig(M, 206, 46, 153, 0, 13, 19, R, { off: .8, wall: -40, spill: 46 }); adRig(M, 206, 26, 153, 0, 13, 15, R, { off: .8, wall: -40, spill: 46 });
  /* lantern lines over the alley */
  for (let i = 0; i < 2; i++) { const z0 = 160 + i * 4; const pts = [[140, 8, z0], [185, 5.4, z0 + 2], [250, 8.5, z0 - 1]]; M.tube(pts, .04, 10, 3, { c: 0x111018 }); for (let k = 0; k < 8; k++) { const t = (k + .5) / 8; const x = lerp(140, 250, t), y = 8 - 2.7 * Math.sin(t * Math.PI) ; const lc = R.pick([PAL.red, PAL.yellow, PAL.orange]); M.set({ kind: K.PLAIN, c: hex(lc), em: 255, layer: 0 }); M.blob(x, y - .5, z0 + 1, .4, { sy: 1.2, r: R }); M.set({ em: 0 }); glow(x, y - .5, z0 + 1, lc, 5.5); } }
  /* the bowl has a solid body, so windows do not show through it */
  { const hx = BOWL.x, hz = BOWL.z, hy = 38, S = 12.7, prof = [[.0, -.5], [.25, -.5], [.5, -.45], [.82, -.05], [1, .38]]; const P = (A, r, y) => [hx + Math.cos(A) * r * S, hy + y * S, hz + Math.sin(A) * r * S];
    M.set({ kind: K.PLAIN, c: [.2, .03, .12], em: 60, layer: 0 }); for (let j = 0; j < prof.length - 1; j++) for (let i = 0; i < 18; i++) { const a0 = i / 18 * TAU, a1 = (i + 1) / 18 * TAU, [r0, y0] = prof[j], [r1, y1] = prof[j + 1]; M.quad(P(a0, r0, y0), P(a0, r1, y1), P(a1, r1, y1), P(a1, r0, y0)); M.quad(P(a1, r0, y0), P(a1, r1, y1), P(a0, r1, y1), P(a0, r0, y0)); }
    M.set({ c: [.26, .15, .05], em: 70 }); for (let i = 0; i < 18; i++) { const a0 = i / 18 * TAU, a1 = (i + 1) / 18 * TAU; M.tri([hx, hy + .3 * S, hz], P(a1, 1, .34), P(a0, 1, .34)); M.tri([hx, hy + .3 * S, hz], P(a0, 1, .34), P(a1, 1, .34)); } M.set({ em: 0 }); }
  pool(BOWL.x, BOWL.z + 8, 58, PAL.pink, .6); pool(195, 205, 60, PAL.pink, .1);
  pool(190, 150, 34, PAL.pink, .4);
}

function gymDistrict(M, R) {
  /* warehouses, pale concrete, roll-up door, orange neon, pipes */
  for (let i = 0; i < 11; i++) {
    const x = 160 + (i % 4) * 54 + R.range(-3, 3) , z = -60 - Math.floor(i / 4) * 66 + R.range(-3, 3), w = R.range(34, 46), d = R.range(30, 46), h = R.range(14, 44);
    if (x > 250 && x < 276) continue;
    if (Math.abs(x - GYM.x) < 58 && Math.abs(z - GYM.z) < 52) continue;
    const t = tower(M, x, z, w, d, h, 'concrete', R, { segs: R.int(1, 2) });
    /* bolted panels and a pipe rack */
    for (let k = 0; k < 8; k++) { setPlain(M, R.pick([0x4a5260, 0x565a68, 0x3e4250])); M.box(x + R.range(-w / 2 + 3, w / 2 - 3), R.range(2, h * .8), z + d / 2 + .12, R.range(3, 9), R.range(2, 5), .22, { crease: false }); }
    for (let k = 0; k < 3; k++) M.cyl(x - w / 2 + 3 + k * 1.2, 0, z + d / 2 + 1, .25, .25, h, 4, { c: 0x5a5664, top: false });
  }
  /* the gym itself */
  const gx = GYM.x, gz = GYM.z;
  tower(M, gx, gz, 62, 44, 34, 'concrete', R, { segs: 1, lit: .1, clutter: 10 });
  setPlain(M, 0x8f4a1f); M.box(gx, 0, gz + 22.2, 22, 10, .3, { c: 0x8f6a2a, crease: false });
  for (let i = 0; i < 12; i++) { setPlain(M, 0x6e5220); M.box(gx, i * .8 + .3, gz + 22.4, 22, .12, .1, { crease: false }); }
  setPlain(M, 0x0e0d16); M.box(gx, 15, gz + 22.1, 26, 6, .3, {}); M.plate(gx, 18, gz + 22.3, 24, 5.4, 0, CELL.p11, { seed: 20, em: 255 });
  neonStrip(M, gx - 13, 12, gz + 22.5, .3, 10, .2, PAL.orange, 0); neonStrip(M, gx + 13, 12, gz + 22.5, .3, 10, .2, PAL.orange, 0);
  blade(M, gx - 26, 24, gz + 23.5, Math.PI / 2, 12, 16, R); blade(M, gx + 30, 20, gz + 23.5, Math.PI / 2, 10, 2, R);
  /* the side door on the east wall, rolled up, the bay behind it lit: the way into the room (GR). Close to, the hole shows the room itself */
  { const x = GR.x + GR.w / 2, z = GR.z, dz = GDOOR.dz, dh = GDOOR.h;
    /* one quad facing out, so from inside (the street seen through the door) it's culled */
    setPlain(M, 0x3a2414); M.id = M.nid(); M.quad([x + .15, .02, z + dz], [x + .15, .02, z - dz], [x + .15, dh, z - dz], [x + .15, dh, z + dz], [0, 0, 1, 1]);
    setPlain(M, 0x4a4e5a); for (const s of [-1, 1]) M.box(x + .1, 0, z + s * (dz + .1), .3, dh + .1, .2, {}); M.box(x + .2, dh, z, .5, .75, 2 * dz + .4, {});
    setPlain(M, 0xf2c218); M.box(x + .5, 0, z, .8, .03, 2 * dz, {});
    neonStrip(M, x + .48, dh + .8, z, .06, .06, 2 * dz + .4, PAL.orange, 0);
    glow(x + 1, 1.8, z, PAL.orange, 9); pool(x + 4, z, 8, PAL.orange, .6); }
  /* the roof sign, big enough to read across the island */
  setPlain(M, 0x2a2a30); for (const dx of [-16, 0, 16]) { M.box(gx + dx, 34, gz + 12, .7, 28, .7, {}); M.beam([gx + dx, 34, gz + 2], [gx + dx, 50, gz + 12], .5, {}); }
  setPlain(M, 0x0e0d12); M.box(gx, 46, gz + 11.6, 45, 15, .6, {}); M.plate(gx, 53.5, gz + 12, 43, 13, 0, CELL.gymRoof, { seed: 20, em: 255 });
  neonStrip(M, gx, 45.8, gz + 12.2, 44, .3, .2, PAL.orange, 0); glow(gx, 54, gz + 16, PAL.orange, 58);
  glow(gx, 18, gz + 26, PAL.orange, 44); pool(gx, gz + 42, 42, PAL.orange, .7); pool(gx - 40, gz + 44, 26, PAL.magenta, .45);
  /* barrel fires under the towers */
  for (const [x, z] of [[gx - 42, gz + 30], [170, -22]]) { M.cyl(x, 0, z, .55, .55, 1.1, 8, { c: 0x2a2228 }); glow(x, 1.7, z, 0xff8a30, 11); pool(x, z, 9, 0xff8a30, .8); }
}

/* the avenue the camera flies down gets real street furniture */
function streetLife(M, R) {
  const lamp = (x, z, dir) => { setPlain(M, 0x262432); M.cyl(x, 0, z, .14, .1, 8.2, 5, { c: 0x262432, top: false }); M.box(x + dir * 1.1, 8.1, z, 2.4, .14, .22, {}); M.set({ kind: K.PLAIN, c: hex(0xffc47a), em: 255, layer: 0 }); M.box(x + dir * 1.9, 7.98, z, .9, .1, .22, {}); M.set({ em: 0 }); glow(x + dir * 1.9, 7.9, z, 0xffb060, 7); pool(x + dir * 1.9, z, 13, PAL.orange, .55); };
  for (let z = 244; z > -150; z -= 22) { const dj = (Math.round(z / 22) % 2) ? 0 : 11; lamp(-10.2, z, 1); lamp(10.2, z - 11, -1); }
  /* palms down the sidewalks */
  for (let z = 236; z > -130; z -= 34) { if (Math.abs(z - SHOP.z) > 16) palm(M, -12.5, z, R.range(11, 15), R); palm(M, 12.5, z - 16, R.range(11, 15), R); }
  /* cables across the street */
  for (let z = 240; z > -120; z -= 13) {
    const y0 = R.range(11, 19), y1 = R.range(11, 19), mid = Math.min(y0, y1) - R.range(1, 2.6);
    M.tube([[-17.4, y0, z], [0, mid, z + R.range(-2, 2)], [17.4, y1, z + R.range(-3, 3)]], .035, 8, 3, { c: 0x07060c });
    if (R.chance(.3)) { M.tube([[-17.4, y0 - .6, z + 1], [0, mid - .8, z + 1], [17.4, y1 - .3, z + .6]], .03, 8, 3, { c: 0x07060c }); }
  }
  /* street junk: bags, crates, cones, boxes, cans */
  const junk = (x, z) => {
    const t = R(); setPlain(M, 0);
    if (t < .5) { const nb = R.int(3, 6); for (let i = 0; i < nb; i++) bag(M, x + R.range(-.8, .8), i > 3 ? .5 : 0, z + R.range(-.8, .8), R.range(.3, .48), R.pick([0x0e0e12, 0x14141a, 0x101218, 0x1c1c22]), R); }
    else if (t < .6) { setPlain(M, 0x6e5a3e); M.rbox(x, 0, z, .8, .04, .6, R.range(-.6, .6), { c: 0x6e5a3e }); M.rbox(x + .2, .04, z + .1, .55, .3, .42, R.range(-.3, .3), { c: 0x7a6444 }); setPlain(M, 0xcfc8a8); M.rbox(x + .2, .34, z + .1, .08, .004, .42, 0, {}); }
    else if (t < .75) { M.cyl(x, 0, z, .2, .03, .62, 5, { c: 0xd0602a, top: false }); M.box(x, 0, z, .46, .04, .46, { c: 0x1d1b28 }); }
    else if (t < .9) { M.cyl(x, 0, z, .28, .24, .92, 6, { c: 0x2a4a44 }); }
    else { M.box(x, 0, z, .5, .3, .4, { c: 0xb09a7a }); M.box(x + .3, 0, z + .24, .4, .2, .3, { c: 0xc8b89a }); }
  };
  for (let i = 0; i < 90; i++) { const sgn = R.chance(.5) ? 1 : -1, x = sgn * R.range(14.5, 17.1), z = R.range(-30, 244); if (x < 0 && Math.abs(z - SHOP.z) < 10) continue; junk(x, z); }
  /* kiosks and vending machines */
  const vend = (x, z, ry, cell, c) => { M.at(x, 0, z, ry, () => { setPlain(M, 0x1a1826); M.box(0, 0, 0, 1.25, 2.1, .85, {}); M.plate(0, 1.05, .44, 1.08, 1.95, 0, CELL[cell], { seed: 30, em: 255 }); }); glow(x + Math.sin(ry) * .9, 1.2, z + Math.cos(ry) * .9, c, 4.6); pool(x + Math.sin(ry) * 1.5, z + Math.cos(ry) * 1.5, 5, c, .6); };
  vend(16.6, 118, -Math.PI / 2, 'vendA', PAL.cyan); vend(16.6, 116.4, -Math.PI / 2, 'vendB', PAL.magenta); vend(16.6, 38, -Math.PI / 2, 'vendB', PAL.magenta); vend(-16.6, 92, Math.PI / 2, 'vendA', PAL.cyan); vend(16.6, 73, -Math.PI / 2, 'vendA', PAL.cyan); vend(-16.6, 22, Math.PI / 2, 'vendB', PAL.magenta);
  const kiosk = (x, z, c, cell) => { setPlain(M, 0x241f30); M.box(x, 0, z, 3.4, 2.6, 2.6, {}); M.set({ kind: K.PLAIN, c: hex(c), em: 210, layer: 0 }); M.box(x, .9, z + 1.32, 3, 1.2, .05, { grad: .8 }); M.box(x, .9, z - 1.32, 3, 1.2, .05, { grad: .8 }); M.set({ em: 0 }); setPlain(M, 0x7a1f3a); M.loft([rectPoly(0, 0, 4.6, 3.8).map(p => [x + p[0], 2.6, z + p[1]]), rectPoly(0, 0, 3, 1).map(p => [x + p[0], 3.2, z + p[1]])], {}); pool(x, z, 11, c, .55); glow(x, 1.6, z + 2.2, c, 6); };
  kiosk(13.2, 88, PAL.yellow); kiosk(-13.3, 134, PAL.cyan); kiosk(13.2, 204, PAL.magenta); kiosk(-13.3, -8, PAL.yellow); kiosk(13.2, 16, 0xffb060);
  /* parked cars near the shop: same shape language as traffic */
  /* hydrants, signal poles, crossing lights */
  for (const z of [150, -30, 250]) for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const x = sx * 10.6, zz = z + sz * 12; setPlain(M, 0x1b1a26); M.cyl(x, 0, zz, .1, .1, 6, 4, { c: 0x1b1a26, top: false }); M.box(x - sx * 1.4, 5.8, zz, 3, .12, .12, {}); M.box(x - sx * 3, 5.2, zz, .32, .85, .26, {});
    M.set({ kind: K.NEON, c: hex(sx * sz > 0 ? PAL.green : PAL.red), seed: 0 }); M.box(x - sx * 3, 5.5, zz + .15, .17, .17, .05, {}); glow(x - sx * 3, 5.6, zz + .4, sx * sz > 0 ? PAL.green : PAL.red, 2.4);
  }
  /* the road is not a bare plane: repairs, covers, arrows, tar */
  { const Y = .142, flat = (x0, z0, x1, z1, c) => { M.set({ kind: K.ROAD, layer: L.ASPHALT, c, id: 3, em: 0 }); M.quad([x0, Y, z1], [x1, Y, z1], [x1, Y, z0], [x0, Y, z0], [x0, z1, x1, z0]); };
    for (let z = 244; z > -146; z -= 7.5) { const sgn = R.chance(.5) ? 1 : -1, t = R();
      if (t < .4) { const x = sgn * R.range(1, 7), w = R.range(.9, 2.4), d = R.range(1.6, 4.6); flat(x - w / 2, z - d / 2, x + w / 2, z + d / 2, R.pick([0x121218, 0x26262e, 0x16161c])); }
      else if (t < .62) { const x = sgn * R.range(1.2, 7.5); setPlain(M, 0x2a2a30); M.cyl(x, .1, z, .46, .46, .05, 10, { c: 0x34343a }); setPlain(M, 0x101014); for (let k = -2; k <= 2; k++) M.box(x + k * .15, .152, z, .08, .002, .62 - Math.abs(k) * .1, { crease: false, bot: false }); }
      else if (t < .82) { const x = sgn * (R.chance(.5) ? 3.2 : 6.6); M.set({ kind: K.PLAIN, layer: 0, c: hex(0x8f8a78), em: 0, id: 3 }); M.quad([x - .08, Y, z + 1.6], [x + .08, Y, z + 1.6], [x + .08, Y, z - .4], [x - .08, Y, z - .4]); M.tri([x - .32, Y, z - .4], [x + .32, Y, z - .4], [x, Y, z - 1.2]); }
      else { const x0 = sgn * R.range(1, 6); M.set({ kind: K.PLAIN, layer: 0, c: hex(0x0a0a0e), em: 0, id: 3 }); let px = x0, pz = z; for (let k = 0; k < 7; k++) { const nx = px + R.range(-.7, .7), nz = pz - R.range(.5, 1.1); M.quad([px - .035, Y, pz], [px + .035, Y, pz], [nx + .035, Y, nz], [nx - .035, Y, nz]); px = nx; pz = nz; } }
    }
  }
  /* steam vents */
  for (const [x, z] of [[4, 118], [-6, 80], [6, 30], [-3, 170], [0, -60]]) { setPlain(M, 0x24242a); M.box(x, .1, z, 1.3, .05, 1.3, { crease: false }); setPlain(M, 0x0a0a0d); for (let k = 0; k < 5; k++) M.box(x - .48 + k * .24, .15, z, .12, .004, 1.14, { crease: false, bot: false }); STEAM.push([x, .4, z, R() * 6, 1]); glow(x, 1.6, z, [.2, .2, .22], 6, 1); glow(x + .4, 3.4, z - .3, [.13, .13, .15], 9, 1); glow(x - .3, 5.6, z + .4, [.08, .08, .1], 12, 1); }
}
const STEAM = [];

/* the shop's outside: the wood-and-brass front at the foot of black glass */
function shopFront(M, R) {
  const { x: sx, z: sz, w, d, h } = SHOP; const ex = sx + w / 2; const zN = sz - d / 2, zS = sz + d / 2;
  /* upper floors */
  M.set({ kind: K.FACADE, em: 96, seed: 141, a: 5 });
  M.extrude(rectPoly(sx - .5, sz, w + 2.4, d + 2.4), h + .5, 21, { c: 0x4a3226, grad: .75, topc: 0x241a1e });
  setPlain(M, PAL.brass); M.box(sx - .5, 21, sz, w + 3.2, .5, d + 3.2, {}); M.set({ kind: K.BRASS, em: 0 }); M.box(sx - .5, h + .3, sz, w + 3.2, .3, d + 3.2, { c: PAL.brass });
  /* side and back walls of the ground floor */
  setPlain(M, 0x3a2c28, L.WOOD);
  M.box(sx, 0, zS + .6, w + 1.2, h + .6, 1.2, { uvS: .3 }); M.box(sx, 0, zN - .6, w + 1.2, h + .6, 1.2, { uvS: .3 }); M.box(sx - w / 2 - .6, 0, sz, 1.2, h + .6, d, { uvS: .3 });
  /* roof slab over the room */
  M.box(sx, h, sz, w, .6, d, { c: 0x201a20 });
  /* marble piers and a brass frame around the glass */
  setPlain(M, 0x1c1410, L.WOOD);
  M.box(ex + .25, 0, zN + .1, .9, h + .5, 1, { uvS: .4 }); M.box(ex + .25, 0, zS - .1, .9, h + .5, 1, { uvS: .4 });
  setPlain(M, 0x2a1c16, L.WOOD); M.box(ex + .2, 3.42, sz, .55, h - 3.42 + .3, d, { uvS: .4 });
  M.box(ex + .2, 0, sz - 2.2, .4, .46, 4.4, { uvS: .4 }); M.box(ex + .2, 0, sz + 3.65, .35, .46, 1.7, { uvS: .4 });
  M.set({ kind: K.BRASS }); M.box(ex + .2, .44, sz - 2.2, .46, .05, 4.4, { c: PAL.brass }); M.box(ex + .2, .44, sz + 3.65, .4, .05, 1.7, { c: PAL.brass }); M.box(ex + .2, 3.38, sz, .46, .06, d, { c: PAL.brass });
  /* straight awning, leather green */
  setPlain(M, PAL.leather);
  M.loft([[[ex + .4, 3.9, zS], [ex + .4, 3.9, zN], [ex + .46, 3.9, zN], [ex + .46, 3.9, zS]], [[ex + 2.6, 3.42, zS], [ex + 2.6, 3.42, zN], [ex + 2.6, 3.32, zN], [ex + 2.6, 3.32, zS]]], {});
  /* gold lettering above */
  setPlain(M, 0x0f0b12); M.box(ex + 1.14, 3.92, sz, .08, 1.14, d - .4, {});
  M.plate(ex + 1.19, 4.49, sz, d - .7, 1.02, Math.PI / 2, CELL.p0, { seed: 10, em: 255 });
  M.set({ kind: K.BRASS, c: PAL.brass }); M.box(ex + 1.18, 3.9, sz, .1, .05, d - .36, {}); M.box(ex + 1.18, 5.06, sz, .1, .05, d - .36, {});
  neonStrip(M, ex + 2.62, 3.34, sz, .06, .06, d, PAL.cyan, 0);
  setPlain(M, 0x15151b); M.box(ex + .7, 7, zN - .4, 1.4, .25, .25, {}); M.box(ex + .7, 21.5, zN - .4, 1.4, .25, .25, {});
  M.at(ex + 1.5, 14.5, zN - .4, 0, () => { setPlain(M, 0x0c0a08); M.box(0, -8, 0, 4.1, 16, .4, {}); M.plate(0, 0, .22, 3.8, 15.6, 0, CELL.oroBlade, { seed: 40, em: 255 }); M.plate(0, 0, -.22, 3.8, 15.6, Math.PI, CELL.oroBlade, { seed: 40, em: 255 }); });
  neonStrip(M, ex + 3.6, 6.5, zN - .4, .1, 16, .1, PAL.yellow, 0); neonStrip(M, ex - .6, 6.5, zN - .4, .1, 16, .1, PAL.yellow, 0); glow(ex + 1.5, 14.5, zN + 1.4, 0xffb040, 20);
  glow(ex + 2.8, 3, sz - 3.4, 0xffc98a, 5); glow(ex + 2.8, 3, sz + 3.4, 0xffc98a, 5);
  pool(ex + 4, sz, 13, 0xffc98a, .6); pool(ex + 10, sz, 10, PAL.cyan, .3);
  /* kitsch noodle neighbour to the south, pale concrete to the north, black glass above */
  tower(M, ex - 11, zS + 11.4, 22, 17, 16, 'kitsch', R, { segs: 1 });
  front(M, ex + .1, zS + 11.4, 15, Math.PI / 2, R);
  wallDetail(M, ex + .1, zS + 11.4, 15, 16, 1, 'kitsch', R);
  setPlain(M, 0xe6b83c); for (const y of [6.6, 11.6]) M.box(ex + .2, y, zS + 11.4, .5, .5, 15.4, {});
  blade(M, ex + 1.2, 11, zS + 4.4, 0, 8, 12, R); blade(M, ex + 1.2, 10, zS + 18, 0, 7, 22, R);
  tower(M, ex - 11, zN - 11, 22, 18, 31, 'concrete', R, { segs: 1 });
  front(M, ex + .1, zN - 11, 15, Math.PI / 2, R);
  wallDetail(M, ex + .1, zN - 11, 15, 31, 1, 'concrete', R);
  blade(M, ex + 1.2, 15, zN - 4, 0, 10, 30, R);
  tower(M, sx - 22, sz - 2, 26, 44, 160, 'corp', R, { segs: 4 });
  wallDetail(M, ex + .7, sz, d, 21, 1, 'luxe', R, 5.2);
}

function buildCityWorld() {
  const M = new MB(170000); const R = rng(2077);
  buildGroundAndRoads(M);
  deck(M, HIGHWAY, 15, { neon: PAL.yellow, every: 7, lanes: 1 });
  deck(M, RAIL_CLOSED.concat([RAIL_CLOSED[0]]), 6.5, { c: 0x4a4656, every: 7, neon: PAL.cyan });
  bridge(M, R); harbour(M, R);
  shopFront(M, R);
  megatower(M); towerMark(M); megablock(M); castle(M); mountain(M); market(M, R); gymDistrict(M, R); streetLife(M, R); shopKerb(M, rng(3131)); nearTower(M); quayDress(M, rng(7171)); nearBoats(M, rng(8181));
  /* downtown lots */
  const lots = (x0, x1, z0, z1, gen) => { let x = x0; while (x < x1 - 10) { const w = Math.min(x1 - x, R.range(26, 46)); let z = z0; const ww = (x1 - x - w < 16) ? x1 - x : w; while (z < z1 - 10) { const d0 = R.range(26, 48); const d = (z1 - z - d0 < 16) ? z1 - z : d0; gen(x + ww / 2, z + d / 2, ww - R.range(1, 4), d - R.range(1, 4)); z += d; } x += ww; } };
  const downtownH = (x, z) => { const r = Math.hypot(x, z + 170); return 54 + 240 * Math.exp(-r * r / (190 * 190)) * R.range(.5, 1.12); };
  const blocked = (x, z, w, d) => { const xS = SHOP.x; if (x - w / 2 < xS + 8 && x + w / 2 > xS - 36 && z - d / 2 < SHOP.z + 26 && z + d / 2 > SHOP.z - 28) return true; return false; };
  const dt = (x, z, w, d) => {
    if (blocked(x, z, w, d)) return; const h = downtownH(x, z);
    const t = R(); let era = t < .62 ? 'corp' : t < .78 ? 'concrete' : t < .92 ? 'kitsch' : 'luxe';
    if (h > 150) era = t < .86 ? 'corp' : 'concrete';
    if (x > 0 && x < 70 && z > 10 && z < 120) era = 'corp';
    const H = era === 'corp' ? h : era === 'kitsch' ? Math.min(h * .4, 48) : Math.min(h * .68, 110);
    tower(M, x, z, w, d, H, era, R);
    /* avenue facing life */
    const onAve = Math.abs(Math.abs(x) - w / 2 - 17.5) < 3.5; const facing = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    const edge = x > 0 ? x - w / 2 - .1 : x + w / 2 + .1;
    if (onAve) {
      const fronts = Math.max(1, Math.round(d / 15)); for (let i = 0; i < fronts; i++) { const fz = z - d / 2 + (i + .5) * d / fronts; front(M, edge, fz, d / fronts - .6, facing, R); }
      const nb = R.int(2, 4); for (let i = 0; i < nb; i++) blade(M, edge + (x > 0 ? -1.4 : 1.4), R.range(10, H * .42 > 40 ? 40 : Math.max(H * .42, 12)), z + R.range(-d * .4, d * .4), 0, R.range(6, 13), R.int(0, 40), R);
      if (H > 60) { if (R.chance(.5)) adRig(M, edge, R.range(30, 42), z, facing, Math.min(d - 6, 13), 19, R, { off: 1.3 }); else wrapSign(M, edge, R.range(26, 44), z + R.range(-4, 4), facing, 4.6, 22, R.int(0, 40), R); }
      wallDetail(M, edge, z, d, Math.min(H, 76), x > 0 ? -1 : 1, era, R);
    } else {
      /* south faces get screens and blades too so the city reads from the water */
      if (H > 50 && R.chance(.5)) { if (R.chance(.3)) adRig(M, x + R.range(-w * .2, w * .2), H * R.range(.34, .5), z + d / 2, 0, Math.min(w - 8, 14), 20, R); else wrapSign(M, x + R.range(-w * .34, w * .34), H * R.range(.3, .55), z + d / 2, 0, R.range(3.6, 6.4), R.range(18, 34), R.int(0, 40), R); }
      if (H < 130 && R.chance(.34)) roofSign(M, x, H, z + d * .28, Math.min(w * .8, 26), R);
      if (R.chance(.6)) { const c = R.pick([PAL.magenta, PAL.cyan, PAL.yellow, PAL.orange]); pool(x, z + d / 2 + 7, R.range(14, 24), c, .35); for (let i = 0; i < 3; i++) blade(M, x + R.range(-w / 2, w / 2), R.range(9, 22), z + d / 2 + .5, 0, R.range(5, 10), R.int(0, 40), R); }
    }
    if (H > 100 && era === 'corp' && R.chance(.5)) M.set({});
  };
  heroRow(M, rng(1212));
  lots(-118, -17.5, -19, 139, dt); lots(17.5, 118, -19, 139, dt); lots(-118, -17.5, -159, -41, dt); lots(17.5, 118, -159, -41, dt);
  lots(-252, -138, -299, -41, dt); lots(-118, 118, -420, -321, dt); lots(138, 252, -299, -212, dt);
  oppositeShop(M, rng(6161));
  /* megablock neighbourhood */
  const blk = (x, z, w, d) => { if (Math.hypot(x + 280, z - 40) < 112) return; const h = R.range(18, 70); tower(M, x, z, w, d, h, R.chance(.5) ? 'concrete' : 'kitsch', R); if (R.chance(.7)) { front(M, x, z + d / 2 + .1, Math.min(w - 2, 16), 0, R); for (let i = 0; i < 2; i++) blade(M, x + R.range(-w / 2, w / 2), R.range(8, h * .7), z + d / 2 + .5, 0, R.range(5, 9), R.int(0, 40), R); } };
  lots(-410, -272, -160, 180, blk); lots(-252, -138, -19, 139, blk); lots(-400, -272, -299, -180, blk); lots(-252, -138, 161, 230, blk);
  /* back of the island */
  lots(-400, 400, -450, -330, (x, z, w, d) => { if (Math.abs(x) < 118) return; tower(M, x, z, w, d, R.range(30, 120), R.pick(['corp', 'concrete', 'kitsch']), R); });
  lots(272, 410, 20, 240, (x, z, w, d) => { const h = R.range(14, 52); tower(M, x, z, w, d, h, R.chance(.7) ? 'kitsch' : 'concrete', R); front(M, x, z + d / 2 + .1, Math.min(w - 2, 14), 0, R); });
  /* waterfront palms and promenade */
  /* none on the castle's point: they'd stand in its walls and across the flight to the study hall. They're drawn into a throwaway builder, so the random sequence and every other palm stay put */
  { let off = null; for (let x = -220; x < 420; x += 15) { const B = x < -115 ? (off = off || new MB(3000)) : M; palm(B, x + R.range(-4, 4), 300 + R.range(-9, 7), R.range(16, 27), R); } }
  for (let z = -300; z < 300; z += 30) palm(M, -430 + 18 + Math.abs(z) * .02, z, R.range(11, 17), R);
  setPlain(M, 0x45404f); M.box(100, 0, 279, 660, .5, 3, {});
  /* quay cranes on the west of downtown for silhouette */
  for (const [x, z] of [[-120, 300], [-160, 298]]) { setPlain(M, 0x2c2838); M.box(x, 0, z, 1.6, 42, 1.6, {}); M.beam([x - 26, 40, z], [x + 34, 46, z], 1.4, { c: 0x34303e }); glow(x + 34, 46, z, PAL.red, 7, 1); }
  /* light pools along the cross streets */
  for (const [z] of ROADS.ew) for (let x = -400; x < 400; x += 26) pool(x + 5, z + (x % 52 ? 8 : -8), 13, R.chance(.3) ? 0x70c8e0 : 0xffa860, .26);
  for (const [x] of ROADS.ns) if (x) for (let z = -440; z < 250; z += 26) pool(x + (z % 52 ? 7 : -7), z, 13, R.chance(.3) ? 0x70c8e0 : 0xffa860, .26);
  for (let i = 0; i < 90; i++) pool(R.range(-120, 120), R.range(-160, 240), R.range(8, 18), R.pick([PAL.magenta, PAL.cyan, PAL.yellow, PAL.red]), .28);
  /* big holo over the market goes in the fx mesh */
  return M.geom();
}

/* far shores: real boxes, a few draws cheaper than everything else */
function buildFarWorld() {
  const M = new MB(40000); const R = rng(31337);
  const row = (x0, x1, z0, z1, n, h0, h1, lit) => { for (let i = 0; i < n; i++) { const x = R.range(x0, x1), z = R.range(z0, z1), w = R.range(40, 90), d = R.range(40, 90), h = R.range(h0, h1) * (R.chance(.14) ? 1.7 : 1); M.set({ kind: K.FACADE, em: Math.round(lit * R.range(.6, 1.2) * 255), seed: R() * 255, a: 7 }); M.extrude(rectPoly(x, z, w, d), -2, h, { c: R.pick([0x15142a, 0x1a1830, 0x121226]), grad: .6, topc: 0x1a1830, crease: false }); if (h > h1 * .8) { M.set({ kind: K.PLAIN, c: hex(0x201c36) }); M.box(x, h, z, w * .5, h * .08, d * .5, { crease: false }); glow(x, h * 1.08 + 4, z, R.pick([PAL.red, PAL.cool]), 28, 1); } } };
  row(760, 2600, -1900, 560, 170, 60, 230, .24);
  row(-2600, -760, -1900, 640, 180, 60, 240, .24);
  row(-1200, 800, -2500, -1650, 120, 90, 300, .2);
  row(-2600, -1000, -2400, -1500, 60, 80, 300, .2);
  /* breakwater with lights off to the south-east */
  for (let i = 0; i < 14; i++) { const x = 500 + i * 52, z = 480 - i * 18; M.set({ kind: K.PLAIN, c: hex(0x1a1830), em: 0 }); M.box(x, -2, z, 40, 5, 12, { crease: false }); if (i % 2) glow(x, 6, z, PAL.orange, 16); }
  return M.geom();
}

const LANES = [];
function lane(pts, reverse) { const p = reverse ? pts.slice().reverse() : pts; LANES.push(p); return LANES.length - 1; }
const line = (a, b) => [a, b];
function buildLaneTexture() {
  const W = 128, H = LANES.length, data = new Float32Array(W * H * 4);
  LANES.forEach((pts, j) => {
    let tot = 0; const seg = []; for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1], pts[i + 1][2] - pts[i][2]); seg.push(d); tot += d; }
    for (let i = 0; i < W; i++) { let s = i / (W - 1) * tot, k = 0; while (k < seg.length - 1 && s > seg[k]) { s -= seg[k]; k++; } const t = seg[k] ? s / seg[k] : 0, a = pts[k], b = pts[k + 1]; const o = (j * W + i) * 4; data[o] = lerp(a[0], b[0], t); data[o + 1] = lerp(a[1], b[1], t); data[o + 2] = lerp(a[2], b[2], t); data[o + 3] = 1; }
  });
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
function offsetPts(pts, d) { return pts.map((p, i) => { const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, pts.length - 1)]; const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1; return [p[0] - dz / l * d, p[1], p[2] + dx / l * d]; }); }

/* a little car: x side, y up, z forward; alpha 1 = takes instance colour, 3 = glows */
function carGeom(kind = 0) {
  const pos = [], nor = [], col = [];
  const tri = (a, b, c, co, tag) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n) || 1; for (const p of [a, b, c]) { pos.push(...p); nor.push(n[0] / l, n[1] / l, n[2] / l); col.push(co[0] * 255, co[1] * 255, co[2] * 255, tag); } };
  const q = (a, b, c, d, co, tag) => { tri(a, b, c, co, tag); tri(a, c, d, co, tag); };
  const dk = [.05, .05, .09], gl = [.1, .14, .24], hd = [1, .97, .88], tl = [1, .1, .1];
  const W = .95, L = 2.3, H = kind === 1 ? 1.75 : 1.32, Y = .24;
  const prof = [[L, Y + .12], [L * .98, Y + .52], [L * .42, Y + .66], [L * .1, H], [-L * .55, H], [-L * .95, Y + .7], [-L, Y + .12]];
  for (let i = 0; i < prof.length - 1; i++) { const [z0, y0] = prof[i], [z1, y1] = prof[i + 1]; const glass = i === 2 || i === 4; const inset0 = y0 > Y + .7 ? .78 : 1, inset1 = y1 > Y + .7 ? .78 : 1; q([W * inset0, y0, z0], [W * inset1, y1, z1], [-W * inset1, y1, z1], [-W * inset0, y0, z0], glass ? gl : [.5, .5, .5], glass ? 0 : 1); }
  /* sides */
  for (const s of [1, -1]) { for (let i = 0; i < prof.length - 1; i++) { const [z0, y0] = prof[i], [z1, y1] = prof[i + 1]; const i0 = y0 > Y + .7 ? .78 : 1, i1 = y1 > Y + .7 ? .78 : 1; const A = [s * W * i0, y0, z0], B = [s * W * i1, y1, z1], C = [s * W * i1, Y, z1], D = [s * W * i0, Y, z0]; if (s > 0) q(A, D, C, B, [.5, .5, .5], 1); else q(A, B, C, D, [.5, .5, .5], 1); }
    q([s * W * .96, Y + .62, L * .36], [s * W * .79, H - .05, L * .08], [s * W * .79, H - .05, -L * .5], [s * W * .96, Y + .68, -L * .9], gl, 0); }
  /* underside, wheels */
  q([-W, Y, L], [W, Y, L], [W, Y, -L], [-W, Y, -L], dk, 0);
  for (const s of [1, -1]) for (const z of [L * .6, -L * .6]) { q([s * (W + .02), 0, z - .36], [s * (W + .02), 0, z + .36], [s * (W + .02), .62, z + .36], [s * (W + .02), .62, z - .36], dk, 0); }
  /* lights */
  q([W * .92, Y + .42, L + .01], [W * .4, Y + .42, L + .01], [W * .4, Y + .56, L + .01], [W * .92, Y + .56, L + .01], hd, 3);
  q([-W * .4, Y + .42, L + .01], [-W * .92, Y + .42, L + .01], [-W * .92, Y + .56, L + .01], [-W * .4, Y + .56, L + .01], hd, 3);
  q([-W * .94, Y + .5, -L - .01], [W * .94, Y + .5, -L - .01], [W * .94, Y + .62, -L - .01], [-W * .94, Y + .62, -L - .01], tl, 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3)); g.setAttribute('aCol', new THREE.BufferAttribute(new Uint8Array(col), 4, true)); return g;
}

function trainCar(len = 22) {
  const M = new MB(1200); const w = 3.1, h = 3.4;
  M.id = 40;
  setPlain(M, 0x242a3e);
  M.extrude(chamferPoly(0, 0, w, len, .8), .5, h, { grad: .8, topc: 0x2e344c });
  M.box(0, 0, 0, w * .86, .5, len * .9, { c: 0x14141f });
  /* window band: lit */
  M.set({ kind: K.NEON, c: hex(0xffd08a), seed: 0, layer: 0 });
  for (const s of [1, -1]) for (let i = 0; i < 7; i++) { const z = -len / 2 + 1.6 + i * (len - 3.2) / 6.5; const A = [s * (w / 2 + .03), 1.6, z], B = [s * (w / 2 + .03), 1.6, z + 2.4], C = [s * (w / 2 + .03), 2.7, z + 2.4], D = [s * (w / 2 + .03), 2.7, z]; if (s > 0) M.quad(B, A, D, C); else M.quad(A, B, C, D); }
  M.set({ kind: K.NEON, c: hex(PAL.magenta) }); M.box(0, 3.45, 0, .2, .08, len * .8, {});
  return M.geom();
}
function trainPos(t) { /* time-only position along the closed rail with a stop at the station */ const n = RAIL_CLOSED.length; const s = ((t % 1) + 1) % 1 * n; const i = Math.floor(s), f = s - i; const a = RAIL_CLOSED[i % n], b = RAIL_CLOSED[(i + 1) % n]; return { p: [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)], d: [b[0] - a[0], b[1] - a[1], b[2] - a[2]] }; }

/* additive shapes in the city: searchlight cones, noodle bowl hologram */
function buildCityFx() {
  const M = new MB(3000); const R = rng(4);
  const cone = (x, y, z, dx, dy, dz, len, r, c, a) => {
    const b = [x + dx * len, y + dy * len, z + dz * len]; const seg = 10; const l = Math.hypot(dx, dy, dz); const t = [dx / l, dy / l, dz / l]; const u = Math.abs(t[1]) > .9 ? [1, 0, 0] : [0, 1, 0]; const s1 = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]]; const ls = Math.hypot(...s1); s1[0] /= ls; s1[1] /= ls; s1[2] /= ls; const s2 = [t[1] * s1[2] - t[2] * s1[1], t[2] * s1[0] - t[0] * s1[2], t[0] * s1[1] - t[1] * s1[0]];
    M.set({ kind: 1, a: Math.round(a * 255), c });
    for (let i = 0; i < seg; i++) { const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU; const P = (A, rr, o) => [o[0] + (s1[0] * Math.cos(A) + s2[0] * Math.sin(A)) * rr, o[1] + (s1[1] * Math.cos(A) + s2[1] * Math.sin(A)) * rr, o[2] + (s1[2] * Math.cos(A) + s2[2] * Math.sin(A)) * rr]; const A0 = P(a0, r * .06, [x, y, z]), A1 = P(a1, r * .06, [x, y, z]), B0 = P(a0, r, b), B1 = P(a1, r, b); M.quad(A0, A1, B1, B0, [0, 0, 1, 1]); }
  };
  /* three thin searchlights; where they end the sky lights the cloud deck */
  for (const s of SHAFTS) { const dx = s.e[0] - s.o[0], dy = s.e[1] - s.o[1], dz = s.e[2] - s.o[2], l = Math.hypot(dx, dy, dz); cone(s.o[0], s.o[1], s.o[2], dx / l, dy / l, dz / l, l, s.r, s.c, s.a); }
  /* noodle bowl hologram over the market, with real volume */
  const hx = BOWL.x, hz = BOWL.z, hy = 38, S = 13;
  const bowl = [[.0, -.5], [.25, -.5], [.5, -.45], [.82, -.05], [1, .38], [.96, .42]];
  M.set({ kind: 2, a: 150, c: [1, .28, .62] });
  for (let j = 0; j < bowl.length - 1; j++) for (let i = 0; i < 18; i++) { const a0 = i / 18 * TAU, a1 = (i + 1) / 18 * TAU; const [r0, y0] = bowl[j], [r1, y1] = bowl[j + 1]; const P = (A, r, y) => [hx + Math.cos(A) * r * S, hy + y * S, hz + Math.sin(A) * r * S]; M.quad(P(a0, r0, y0), P(a0, r1, y1), P(a1, r1, y1), P(a1, r0, y0)); M.quad(P(a1, r0, y0), P(a1, r1, y1), P(a0, r1, y1), P(a0, r0, y0)); }
  M.set({ kind: 2, a: 190, c: [1, .85, .3] });
  for (let i = 0; i < 18; i++) { const a0 = i / 18 * TAU, a1 = (i + 1) / 18 * TAU; const P = (A, r, y) => [hx + Math.cos(A) * r * S, hy + y * S, hz + Math.sin(A) * r * S]; M.tri([hx, hy + .3 * S, hz], P(a1, .96, .34), P(a0, .96, .34)); M.tri([hx, hy + .3 * S, hz], P(a0, .96, .34), P(a1, .96, .34)); }
  /* chopsticks and steam ribbons */
  M.set({ kind: 2, a: 200, c: [.4, .95, 1] });
  for (const dx of [.1, .3]) { const a = [hx + dx * S, hy + .3 * S, hz], b = [hx + (dx + .9) * S, hy + 1.5 * S, hz - .3 * S]; const e = .35; M.quad([a[0] - e, a[1], a[2]], [a[0] + e, a[1], a[2]], [b[0] + e, b[1], b[2]], [b[0] - e, b[1], b[2]]); M.quad([b[0] - e, b[1], b[2]], [b[0] + e, b[1], b[2]], [a[0] + e, a[1], a[2]], [a[0] - e, a[1], a[2]]); }
  M.set({ kind: 2, a: 120, c: [1, .72, .8] });
  for (let k = 0; k < 3; k++) for (let i = 0; i < 8; i++) { const x0 = hx + (k - 1) * .35 * S + Math.sin(i * .9 + k) * 2.2, x1 = hx + (k - 1) * .35 * S + Math.sin((i + 1) * .9 + k) * 2.2, y0 = hy + (.5 + i * .16) * S, y1 = hy + (.5 + (i + 1) * .16) * S; M.quad([x0 - .35, y0, hz], [x0 + .35, y0, hz], [x1 + .35, y1, hz], [x1 - .35, y1, hz]); M.quad([x1 - .35, y1, hz], [x1 + .35, y1, hz], [x0 + .35, y0, hz], [x0 - .35, y0, hz]); }
  /* light cone holding it up */
  M.set({ kind: 1, a: 40, c: [1, .4, .7] });
  for (let i = 0; i < 10; i++) { const a0 = i / 10 * TAU, a1 = (i + 1) / 10 * TAU; const P = (A, r, y) => [hx + Math.cos(A) * r, y, hz + Math.sin(A) * r]; M.quad(P(a0, .8, 14), P(a1, .8, 14), P(a1, S * .9, hy - .4 * S), P(a0, S * .9, hy - .4 * S), [0, 1, 1, 0]); }
  /* each screen's light on the wall around it */
  for (const s of SPILLS) { M.set({ kind: 6, a: s.a, c: [1, 1, 1], seed: s.seed }); M.at(s.x, s.y, s.z, s.ry, () => { M.quad([-s.w / 2, -s.h / 2, s.wall], [s.w / 2, -s.h / 2, s.wall], [s.w / 2, s.h / 2, s.wall], [-s.w / 2, s.h / 2, s.wall], [0, 0, 1, 1]); }); if (s.roof) { const r = s.roof; M.quad([r.x - r.w / 2, r.y, r.z + r.d / 2], [r.x + r.w / 2, r.y, r.z + r.d / 2], [r.x + r.w / 2, r.y, r.z - r.d / 2], [r.x - r.w / 2, r.y, r.z - r.d / 2], [0, 0, 1, 1]); } }
  /* the wide screen's light: down the south face, down the east face, on the pavement */
  for (const [x0, z0, x1, z1, xE, y, h] of WIDE_SPILL) { const c = [.18, .62, 1]; M.set({ kind: 7, a: 170, c }); M.quad([x0 - 26, y - 22, z0 + .4], [x1 + 12, y - 22, z0 + .4], [x1 + 12, y + h + 8, z0 + .4], [x0 - 26, y + h + 8, z0 + .4], [0, 0, 1, 1]); M.quad([xE + .4, y - 22, z1 + 12], [xE + .4, y - 22, z1 - 50], [xE + .4, y + h + 8, z1 - 50], [xE + .4, y + h + 8, z1 + 12], [0, 0, 1, 1]); }
  /* the hologram's light lying on the tower behind it */
  M.set({ kind: 7, a: 150, c: [.16, .7, .85] }); M.quad([-92, 214, -205], [34, 214, -205], [34, 416, -205], [-92, 416, -205], [0, 0, 1, 1]); M.set({ kind: 7, a: 90, c: [1, .22, .14] }); M.quad([-66, 240, -204.5], [12, 240, -204.5], [12, 360, -204.5], [-66, 360, -204.5], [0, 0, 1, 1]);
  /* street haze blocks over the avenue: flat low quads with warm light */
  const haze = (x, z, w, y, h, c, a) => { M.set({ kind: 4, a: Math.round(a * 255), c }); M.quad([x - w, y, z], [x + w, y, z], [x + w, y + h, z], [x - w, y + h, z], [0, 0, 1, 1]); M.quad([x + w, y, z], [x - w, y, z], [x - w, y + h, z], [x + w, y + h, z], [0, 0, 1, 1]); };
  for (let i = 0; i < 16; i++) { const z = 240 - i * 28; haze(0, z, 26, 0, R.range(26, 42), R.pick([[1, .55, .25], [1, .3, .55], [.9, .45, .4]]), .012); }
  /* one wide band of lit air in each road gap, a colour per depth */
  haze(0, 262, 620, 0, 50, [1, .5, .24], .06); haze(0, 150, 620, 0, 80, [.9, .32, .3], .07); haze(0, -30, 620, 0, 110, [.2, .56, .66], .09); haze(0, -170, 620, 0, 120, [.9, .3, .3], .08); haze(0, -310, 620, 0, 150, [.2, .4, .6], .07);
  haze(195, 150, 90, 0, 40, [1, .25, .45], .06); haze(195, 240, 90, 0, 32, [1, .55, .2], .05); haze(290, -110, 90, 0, 30, [1, .45, .15], .05); haze(-280, 80, 110, 0, 40, [.3, .5, 1], .05); haze(-280, 140, 90, 0, 26, [1, .25, .6], .05);
  return M.geom();
}

/* the row facing the water: four building eras side by side, pale and pink and yellow and black glass */
function heroRow(M, R) {
  /* pale concrete megablock, setbacks and balconies */
  { const x = -92, z = 198, w = 46, d = 62; tower(M, x, z, w * .74, d * .74, 116, 'block', R, { segs: 1, base: 0xb0aaac, lit: .36, clutter: 2 }); tower(M, x, z, w, d, 58, 'block', R, { segs: 1, base: 0xc2bcba, lit: .4, clutter: 6 }); faceDress(M, x, z + d / 2, w, 11, 54, 0, R); faceDress(M, x, z + d * .37, w * .74, 62, 110, 0, R); front(M, x, z + d / 2 + .1, w - 2, 0, R); wrapSign(M, x - 17, 34, z + d / 2 + 2.2, 0, 5, 24, 6, R); adRig(M, x - 8, 92, z + d * .37, 0, 13, 18, R, { off: 2.4 }); roofKit(M, x, 116, z, w * .62, d * .62, R, { units: 5 }); AD_USED = Math.max(AD_USED, 8); setPlain(M, 0x24242c); M.extrude([[-80, 230], [-66, 208], [-75, 208], [-80, 221]], 64, 108, { topc: 0x1a1a22, crease: false }); adRig(M, -73, 86, 219, 1, 26, 38, R, { off: .6, wall: -.4, spill: 165, roof: { x: -44, y: 48.2, z: 200, w: 40, d: 54 } }); AD_USED = Math.max(AD_USED, 9); M.set({ kind: K.PLAIN, em: 255, c: hex(0xffd08a), layer: 0 }); for (const [dx, dy] of [[20, 46], [15, 46], [20, 40.6]]) M.box(x + dx, dy, z + d / 2 + .2, 3.2, 3, .12, { grad: 1 }); M.set({ em: 0 }); glow(x + 19, 47, z + d / 2 + 2, 0xffd08a, 16); pool(x, z + d / 2 + 12, 26, 0xffd8a0, .45); }
  /* pink rounded block: stacked curved balconies, a lift shaft, a wrap screen bent round the corner */
  { const x = -44, z = 200, w = 42, d = 58, h = 48; tower(M, x, z, w, d, h, 'kitsch', R, { segs: 1, base: 0xb0586c, lit: .36, clutter: 0 });
    /* curved balcony slabs with rails; washing and pots between */
    for (let y = 8; y < h - 26; y += 4.4) { const ring = roundPoly(x, z, w + 2.6, d + 2.6, 14.3, 4); setPlain(M, y % 8.8 < 4.4 ? 0xd8b84a : 0xc8c0b0); M.extrude(ring, y, y + .36, { crease: false, grad: .85, topc: 0x4a4048 }); setPlain(M, 0x2a2228); M.extrude(roundPoly(x, z, w + 2.8, d + 2.8, 14.4, 4), y + .36, y + 1.3, { top: false, crease: false, grad: .85 }); }
    for (let i = 0; i < 26; i++) { const yy = 8 + R.int(0, 3) * 4.4 + .4, bx = x + R.range(-w * .26, w * .26), t0 = R(); if (t0 < .4) { M.set({ kind: K.PLAIN, c: hex(R.pick([0xb9b2c4, 0xc05a8a, 0x5aa2b0, 0xd0a040, 0xe0dcd0])), id: M.nid() }); const q = [[bx - .9, yy + 2.7, z + d / 2 + 1.1], [bx + .9, yy + 2.7, z + d / 2 + 1.1], [bx + .9, yy + 1.3, z + d / 2 + 1.1], [bx - .9, yy + 1.3, z + d / 2 + 1.1]]; M.quad(q[0], q[1], q[2], q[3]); M.quad(q[3], q[2], q[1], q[0]); } else if (t0 < .7) { M.cyl(bx, yy, z + d / 2 + .7, .22, .28, .5, 5, { c: 0x4a3a2a }); M.blob(bx, yy + .9, z + d / 2 + .7, .5, { c: 0x234a33, r: R }); } else { setPlain(M, 0x55535e); M.box(bx, yy, z + d / 2 + .6, 1.1, .8, .7, {}); } }
    /* lift shaft up the west of the front */
    setPlain(M, 0x4a4250); M.box(x - 15, 0, z + d / 2 - 1.2, 4.6, h + 7, 3.2, { topc: 0x24202a }); M.set({ kind: K.PLAIN, c: hex(0xffe0a8), em: 120 }); M.box(x - 15, 2, z + d / 2 + .42, 3.2, h + 2, .04, {}); M.set({ em: 0 }); setPlain(M, 0x2a2430); for (let y = 2; y < h + 4; y += 3.6) M.box(x - 15, y, z + d / 2 + .46, 3.5, .22, .08, {});
    front(M, x, z + d / 2 + .3, w - 14, 0, R); roofKit(M, x, h, z, w * .8, d * .8, R, { units: 5, tanks: 1 }); pool(x, z + d / 2 + 12, 28, PAL.orange, .55);
    /* the wide screen bends round the south-east corner, name on both faces */
    const yS = 26, hS = 18; bendScreen(M, -52, 229.5, -36, 229.5, -36, 216, 13.5, -22.5, 216, -22.5, 186, yS, hS, 0, R);
    WIDE_SPILL.push([-58, 229, -36, 216, -23, yS, hS]);
  }
  /* black glass, three setbacks: no ad at all, just its own vertical sign and the stepped crown */
  { const x = 42, z = 198, w = 38, d = 60, h = 148; tower(M, x, z, w, d, h, 'corp', R, { segs: 2, lit: .3 }); wrapSign(M, x + 12, 30, z + d / 2 + .3, 0, 5, 26, 21, R); neonStrip(M, x - w / 2 + 1, 12, z + d / 2 + .2, .14, 30, .14, PAL.cool, 0); neonStrip(M, x + w / 2 - 1, 12, z + d / 2 + .2, .14, 24, .14, PAL.cool, 0); front(M, x, z + d / 2 + .1, w - 2, 0, R); pool(x, z + d / 2 + 12, 30, 0xffb890, .5); }
  /* yellow rounded block: deep horizontal louvres, a stack of round windows, plant on the roof */
  { const x = 90, z = 200, w = 50, d = 60, h = 64; tower(M, x, z, w, d, h, 'kitsch', R, { segs: 1, base: 0xbe9a3c, lit: .34, clutter: 0 });
    setPlain(M, 0xe4dcc4); for (let y = 9; y < h; y += 9) M.extrude(roundPoly(x, z, w + 1.8, d + 1.8, 15.5, 4), y, y + .7, { top: true, topc: 0x5a5040, crease: false, grad: .85 });
    /* vertical fins across the centre of the front, and two neon edges */
    setPlain(M, 0x8a7238); for (let i = -6; i <= 6; i++) M.box(x + i * 2.4, 9, z + d / 2 + .9, .28, h - 12, 1.7, {});
    setPlain(M, 0x7a6a44); M.box(x + 17, 0, z + d / 2 + 1, 6, h + 3, 2, { topc: 0x34302a }); for (let y = 6; y < h; y += 5.4) { M.set({ kind: K.PLAIN, c: hex(0xfff0c0), em: y % 2 < 1 ? 230 : 60 }); M.cyl(x + 17, y, z + d / 2 + 2.02, 1.3, 1.3, .04, 12, {}); M.set({ em: 0 }); }
    wrapSign(M, x - 19, 36, z + d / 2 + .4, 0, 4.6, 30, 12, R);
    roofKit(M, x, h, z, w * .8, d * .8, R, { units: 7, tanks: 2 });
    /* three dim stalls left at the foot of the block, tarps dark */
    for (let i = 0; i < 3; i++) { const sx = 66 + i * 11, sz = 237, ac = R.pick([0x5a2a32, 0x6a5428, 0x1f4a4a]); setPlain(M, 0x241c28); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) M.box(sx + a * 3, 0, sz + b * 1.8, .16, 3, .16, {}); M.box(sx, 0, sz, 5.4, 1, 1.4, { c: 0x4a3a2a }); setPlain(M, ac); M.loft([rectPoly(0, 0, 7, 4.4).map(p => [sx + p[0], 3, sz + p[1]]), rectPoly(0, 0, 2, 1.2).map(p => [sx + p[0], 4, sz + p[1]])], { c: ac }); glow(sx, 2.8, sz + 2, 0xff8a4a, 5); pool(sx, sz, 8, 0xff8a4a, .22); }
    front(M, x, z + d / 2 + .3, w - 14, 0, R); pool(x, z + d / 2 + 12, 30, PAL.red, .4); }
}
const WIDE_SPILL = [];
/* balconies, air units, pipes and a gantry hung on one face; local z points out of the wall */
function faceDress(M, cx, cz, w, y0, y1, ry, R, o = {}) {
  const fl = o.fl || 6.2, dk = o.dk || 0x5a5664;
  M.at(cx, 0, cz, ry, () => {
    const hw = w / 2 - 1;
    for (let y = y0; y < y1; y += fl) {
      let bx = -hw + R.range(0, 2);
      while (bx < hw - 4) {
        const bw = Math.min(R.range(5, 11), hw - bx), mid = bx + bw / 2;
        if (R.chance(.64)) {
          setPlain(M, dk); M.box(mid, y, .9, bw, .3, 1.8, { crease: false });
          setPlain(M, 0x26242c); M.box(mid, y + .3, 1.78, bw, .95, .05, { crease: false, bot: false }); M.box(mid - bw / 2, y + .3, .9, .05, .95, 1.8, { bot: false }); M.box(mid + bw / 2, y + .3, .9, .05, .95, 1.8, { bot: false });
          const t = R();
          if (t < .3) { M.set({ kind: K.PLAIN, c: hex(R.pick([0xb9b2c4, 0xc05a8a, 0x5aa2b0, 0xd0a040, 0xe0dcd0])), id: M.nid() }); const a = mid - 1, b = mid + 1.2, q = [[a, y + 3.2, 1.6], [b, y + 3.2, 1.6], [b, y + 1.8, 1.6], [a, y + 1.8, 1.6]]; M.quad(q[0], q[1], q[2], q[3]); M.quad(q[3], q[2], q[1], q[0]); }
          else if (t < .55) { setPlain(M, 0x4c4a58); M.box(mid + .6, y + .3, .9, 1, .8, .7, {}); setPlain(M, 0x1a1a20); M.box(mid + .6, y + .4, 1.26, .8, .58, .02, {}); }
          else if (t < .75) { M.cyl(mid - .5, y + .3, 1, .22, .28, .5, 5, { c: 0x4a3a2a }); M.blob(mid - .5, y + 1, 1, .55, { c: 0x234a33, r: R }); }
          else if (t < .85) { M.set({ kind: K.NEON, c: hex(R.pick([PAL.cyan, PAL.yellow, PAL.orange])), seed: R() * 200 }); M.box(mid, y + 1.3, 1.8, bw * .8, .06, .05, {}); setPlain(M, 0x26242c); }
        } else if (R.chance(.8)) {
          const yy = y + R.range(.4, 2.6); setPlain(M, R.pick([0x55535e, 0x63606a, 0x45434e])); M.box(mid, yy, .36, 1.2, .78, .72, {}); setPlain(M, 0x17171c); M.box(mid, yy + .1, .73, .96, .56, .02, {}); if (R.chance(.5)) M.cyl(mid + .4, yy - 1.5, .5, .025, .025, 1.5, 3, { c: 0x121216, top: false });
        }
        bx += bw + R.range(.4, 1.6);
      }
    }
    for (let i = 0; i < Math.round(w / 8); i++) { const px = -hw + R() * 2 * hw, r = R.range(.1, .22); M.cyl(px, y0 - 4, .3, r, r, y1 - y0 + 4, 6, { c: 0x34323e, top: false }); for (let y = y0; y < y1; y += 4.6) M.cyl(px, y, .3, r + .05, r + .05, .12, 6, { c: 0x1a1a20 }); }
    /* gantry and bracing */
    for (let y = y0 + 22; y < y1 - 6; y += 38) { setPlain(M, 0x2c2c34); M.box(0, y, 1.3, w - 2, .22, 2.4, {}); M.box(0, y + 1.1, 2.45, w - 2, .08, .08, {}); for (let i = 0; i < Math.round(w / 4); i++) { const px = -hw + i * 4; M.box(px, y, 2.45, .08, 1.1, .08, {}); M.beam([px, y, 2.3], [px + 1.6, y - 2.6, .1], .12, {}); } }
    M.tube([[-hw * .4, y1 * .9, .36], [-hw * .3, (y0 + y1) * .5, .5], [-hw * .45, y0, .34]], .08, 7, 3, { c: 0x07060c });
  });
}
/* the far pavement as framed by the shop window: dark glass above, low signs, lanterns, people */
function oppositeShop(M, R) {
  for (const [z, y, h, idx] of [[40, 7.2, 5.2, 3], [47.5, 6.8, 4.2, 11], [55, 7.6, 5.8, 19], [66, 7, 4.8, 26], [74, 7.8, 6, 7], [83, 6.8, 4.4, 15]]) blade(M, 16.5, y, z, -Math.PI / 2, h, idx, R);
  for (const [z, y, h, idx] of [[51, 8, 6.4, 22], [60, 8.4, 7, 30], [70, 8, 6, 35]]) blade(M, 15.6, y, z, 0, h, idx, R);
  /* lanterns strung across the far pavement */
  for (const z of [48, 58, 68, 78]) { M.tube([[17.4, 7.2, z], [12, 5.3, z + 1], [6.5, 6.4, z + 2.5]], .025, 6, 3, { c: 0x08080c }); for (let k = 0; k < 4; k++) { const t = (k + .5) / 4, xx = lerp(17.4, 6.5, t), yy = 7 - 1.8 * Math.sin(t * Math.PI) * .9 - .5; const lc = R.pick([PAL.red, PAL.yellow, PAL.orange, 0xff5a3a]); M.set({ kind: K.PLAIN, c: hex(lc), em: 255, layer: 0 }); M.blob(xx, yy, z + 1 + t * 1.4, .2, { sy: 1.25, r: R }); M.set({ em: 0 }); glow(xx, yy, z + 1 + t * 1.4, lc, 2.2); } }
  /* a phone-shop light and a dark doorway break the run of lit glass */
  setPlain(M, 0x0a0a10); M.box(17.3, 0, 63, .3, 3.6, 3.4, {}); M.box(17.3, 0, 79, .3, 3.6, 2.6, {}); M.box(17.3, 0, 45, .3, 3.6, 2.6, {});
}

function bendScreen(M, x0, z0, x1, z1, cx, cz, r, xa, za, x2, z2, y, h, seed, R) {
  const path = [[x0, z0]]; const a0 = Math.atan2(z1 - cz, x1 - cx), a1 = Math.atan2(za - cz, xa - cx), steps = 7; /* the arc */
  let da = a1 - a0; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
  for (let i = 0; i <= steps; i++) { const a = a0 + da * i / steps; path.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  path.push([x2, z2]);
  let tot = 0; const L0 = [0]; for (let i = 1; i < path.length; i++) { tot += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); L0.push(tot); }
  const P = (i, yy) => [path[i][0], yy, path[i][1]];
  M.set({ kind: 1, em: 225, seed, c: [1, 1, 1], layer: 0, id: 0, a: 0 });
  for (let i = 0; i < path.length - 1; i++) M.quad(P(i, y), P(i + 1, y), P(i + 1, y + h), P(i, y + h), [L0[i] / tot, 0, L0[i + 1] / tot, 1]);
  /* steel top and bottom following the bend, lamps under */
  const off = (i, k) => { const a = path[Math.max(i - 1, 0)], b = path[Math.min(i + 1, path.length - 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [path[i][0] - dz / l * k, path[i][1] + dx / l * k]; };
  for (const yy of [y - .5, y + h]) { setPlain(M, 0x5c5c66); M.set({ id: M.nid() }); for (let i = 0; i < path.length - 1; i++) { const a = off(i, .55), b = off(i + 1, .55); M.quad([a[0], yy, a[1]], [b[0], yy, b[1]], [b[0], yy + .5, b[1]], [a[0], yy + .5, a[1]]); M.quad([a[0], yy + .5, a[1]], [b[0], yy + .5, b[1]], [path[i + 1][0], yy + .5, path[i + 1][1]], [path[i][0], yy + .5, path[i][1]]); M.quad([path[i][0], yy, path[i][1]], [path[i + 1][0], yy, path[i + 1][1]], [b[0], yy, b[1]], [a[0], yy, a[1]]); } }
  for (let i = 0; i < path.length; i += 2) { const q = off(i, 1.1); setPlain(M, 0x1a1a20); M.box(q[0], y - 1.3, q[1], .7, .22, .7, {}); M.set({ kind: K.PLAIN, c: hex(0xbfefff), em: 255 }); M.box(q[0], y - 1.32, q[1], .5, .03, .5, {}); M.set({ em: 0 }); glow(q[0], y - 1.5, q[1], [.25, .6, .8], 3.5); }
  return path;
}
/* a roof that has been used: plant, tanks, a stair hut, ducts, masts, dishes; not one bare surface */
function roofKit(M, x, y, z, w, d, R, o = {}) {
  /* membrane patches */
  setPlain(M, 0x2c2a32); for (let i = 0; i < 7; i++) { const pw = R.range(2, w * .34), pd = R.range(2, d * .3); M.box(x + R.range(-w * .34, w * .34), y + .02, z + R.range(-d * .34, d * .34), pw, .04, pd, { c: R.pick([0x26242c, 0x33303a, 0x1f1e26]), crease: false, bot: false }); }
  /* a bank of chillers on rails */
  const n = o.units || 6, bx = x - w * .2 + R.range(-2, 2), bz = z - d * .18; setPlain(M, 0x3a3a44); M.box(bx, y, bz, n * 2.5 + 1, .3, 3.2, {});
  for (let i = 0; i < n; i++) { const ux = bx + (i - (n - 1) / 2) * 2.5; setPlain(M, R.pick([0x6a6872, 0x5a5862, 0x74727a])); M.box(ux, y + .3, bz, 2.2, 1.5, 2.6, {}); setPlain(M, 0x15151a); M.cyl(ux, y + 1.8, bz, .92, .92, .06, 10, { c: 0x121216 }); setPlain(M, 0x34343c); M.box(ux, y + 1.87, bz, 1.6, .05, .12, {}); M.box(ux, y + 1.87, bz, .12, .05, 1.6, {}); }
  /* ducts out of the bank */
  M.tube([[bx + n * 1.25, y + 1, bz], [bx + n * 1.25 + 3, y + 1.4, bz + 1], [bx + n * 1.25 + 4, y + .8, bz + 6]], .36, 7, 6, { c: 0x7a7880 });
  /* water tanks on legs */
  for (let k = 0; k < (o.tanks === undefined ? 2 : o.tanks); k++) { const tx = x + w * (.22 + k * .16) * (k % 2 ? -1 : 1), tz = z + d * (k % 2 ? .24 : .1), tr = R.range(1.8, 2.5); setPlain(M, 0x25252c); for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) M.box(tx + a * tr * .7, y, tz + b * tr * .7, .2, 2.8, .2, {}); M.cyl(tx, y + 2.8, tz, tr, tr, 3.4, 12, { c: R.pick([0x7a6450, 0x5a646a, 0x6e5a5a]) }); M.cyl(tx, y + 6.2, tz, tr + .1, .2, 1, 12, { c: 0x3c3838 }); }
  /* stair hut with a lit door */
  { const hx = x - w * .28, hz = z + d * .26; setPlain(M, 0x4a4852); M.box(hx, y, hz, 4, 3.2, 3.4, { topc: 0x2a2a30 }); M.set({ kind: K.PLAIN, c: hex(0xffd8a0), em: 240 }); M.box(hx + .6, y, hz + 1.72, 1, 2.1, .04, {}); M.set({ em: 0 }); glow(hx + .6, y + 2.2, hz + 2.1, 0xffc070, 3.4); setPlain(M, 0x1a1a20); M.box(hx + .6, y + 2.25, hz + 1.8, 1.3, .08, .5, {}); }
  /* masts, a dish, cable trays, a guard rail */
  for (let k = 0; k < 2; k++) { const ax = x + R.range(-w * .4, w * .4), az = z + R.range(-d * .4, d * .4), ah = R.range(8, 16); M.cyl(ax, y, az, .12, .05, ah, 4, { c: 0x25283a }); for (let j = 1; j < 4; j++) M.box(ax, y + ah * j * .22, az, 1.6 - j * .3, .05, .05, { c: 0x25283a }); glow(ax, y + ah, az, PAL.red, 3.4, 1); }
  { const dx = x + w * .3, dz = z - d * .28; M.cyl(dx, y, dz, .14, .14, 1.5, 4, { c: 0x3a3a44, top: false }); M.at(dx, y + 1.5, dz, .6, () => M.lathe(0, 0, 0, [[.05, 0], [1.1, .24], [1.8, .7]], 10, { c: 0xc0bcb8, grad: .55 }), .85); }
  setPlain(M, 0x1c1c22); M.box(x, y + .4, z + d * .36, w * .62, .08, .5, {}); M.box(x - w * .3, y + .4, z, .5, .08, d * .62, {});
}
/* parked cars under long canopies: a real lot, dark, with light only under the roof */
function carPark(M, x, z, rows, cols, R) {
  const carC = [0x2a2c34, 0x4a1a20, 0x23343c, 0x54504a, 0x1a1a20, 0x6a5a20];
  for (let r = 0; r < rows; r++) { const zz = z + r * 15;
    setPlain(M, 0x24222a); for (let k = 0; k <= cols; k += 2) { M.box(x + k * 3.3, 0, zz - 2.8, .22, 3.7, .22, {}); M.box(x + k * 3.3, 0, zz + 2.8, .22, 3.7, .22, {}); }
    /* corrugated roof, ribs catch light */
    setPlain(M, 0x302e36); M.box(x + cols * 1.65, 3.7, zz, cols * 3.3 + 1.6, .14, 7, { topc: 0x2a2830 }); setPlain(M, 0x3c3a42); for (let k = 0; k < cols * 2; k++) M.box(x + .8 + k * 1.65, 3.84, zz, .12, .06, 6.9, {});
    M.set({ kind: K.NEON, c: hex(0xbfe0ff), seed: 0 }); for (let k = 0; k < cols; k += 2) M.box(x + 1.65 + k * 3.3, 3.62, zz, 1.5, .06, .1, {}); setPlain(M, 0);
    pool(x + cols * 1.65, zz, cols * 2.2, 0x88b8e8, .14);
    /* cars, nose out, some gaps */
    for (let k = 0; k < cols; k++) { if (R.chance(.18)) continue; const cx = x + 1.65 + k * 3.3, c = R.pick(carC), l = R.range(4, 4.6); setPlain(M, c); M.box(cx, .3, zz, 1.8, .55, l, { topc: mixC(c, 0xffffff, .08) }); M.box(cx, .85, zz - .1, 1.55, .44, l * .5, { c: mixC(c, 0x000000, .3) }); setPlain(M, 0x08080c); M.box(cx, .3, zz, 1.9, .2, l - 1, {}); M.set({ kind: K.NEON, c: hex(0xff2a2a), seed: 0 }); for (const s of [-.6, .6]) M.box(cx + s, .6, zz + l / 2, .32, .08, .03, {}); setPlain(M, 0); }
  }
  /* painted bays on the lot */
  M.set({ kind: K.PLAIN, c: hex(0x6a6858), em: 0, layer: 0, id: 3 }); for (let r = 0; r <= rows; r++) { const zz = z - 3 + r * 15 - (r === rows ? 9 : 0); for (let k = 0; k <= cols; k += 1) M.quad([x + k * 3.3 - .05, .13, zz + 6], [x + k * 3.3 + .05, .13, zz + 6], [x + k * 3.3 + .05, .13, zz], [x + k * 3.3 - .05, .13, zz]); }
}
/* the quay under the fly-in: paving lines, planters, bollards, lamps, kiosks */
function quayDress(M, R) {
  /* paving joints, two directions, so the plate stops being one colour */
  M.set({ kind: K.PLAIN, c: hex(0x17151c), em: 0, layer: 0, id: 3 });
  for (let x = -220; x <= 420; x += 8) M.quad([x - .06, .05, 300], [x + .06, .05, 300], [x + .06, .05, 262], [x - .06, .05, 262]);
  for (let z = 262; z <= 300; z += 8) M.quad([-220, .05, z + .06], [420, .05, z + .06], [420, .05, z - .06], [-220, .05, z - .06]);
  for (let x = -200; x < 400; x += 26) { const z = 284 + R.range(-1, 1);
    /* lamp */
    setPlain(M, 0x262432); M.cyl(x, 0, z, .16, .1, 7.5, 5, { c: 0x262432, top: false }); M.box(x, 7.4, z, .22, .14, 2.6, {}); M.set({ kind: K.PLAIN, c: hex(0xffc47a), em: 255, layer: 0 }); M.box(x, 7.3, z + 1, .22, .08, .9, {}); M.set({ em: 0 }); glow(x, 7.2, z + 1, 0xffb060, 5.5); pool(x, z + 2, 15, 0xffa860, .5);
    /* planter and bench between lamps */
    setPlain(M, 0x3a3a44); M.box(x + 12, 0, z, 5, .7, 1.5, { topc: 0x1d2a22 }); for (let k = 0; k < 3; k++) M.blob(x + 10.4 + k * 1.6, .9, z, .55, { c: 0x173d2c, r: R });
    setPlain(M, 0x4a3a2a); M.box(x + 6, .45, z - 2, 3, .08, .5, {}); setPlain(M, 0x1a1a20); for (const s of [-1, 1]) M.box(x + 6 + s * 1.3, 0, z - 2, .1, .45, .5, {});
    /* bollard */
    setPlain(M, 0xb09a2a); M.cyl(x + 18, 0, z + 12, .12, .12, .8, 5, {}); }
  /* a dock kiosk or two */
  for (const x of [-140, 40, 190]) { setPlain(M, 0x241f30); M.box(x, 0, 292, 5, 3, 3, {}); const c = R.pick([PAL.cyan, PAL.yellow, PAL.orange]); M.set({ kind: K.PLAIN, c: hex(c), em: 190, layer: 0 }); M.box(x, 1, 293.54, 4.4, 1.3, .05, {}); M.set({ em: 0 }); glow(x, 1.8, 294.5, c, 7); pool(x, 296, 12, c, .4); setPlain(M, 0x7a1f3a); M.box(x, 3, 293, 5.8, .14, 4.6, {}); }
}

function pontoon(M, x, z, ry, R) {
  M.at(x, 6, z, ry, () => {
    /* painted edge and cargo */
    M.set({ kind: K.PLAIN, c: hex(0xc9a020), em: 40, layer: 0, id: 3 }); for (let i = -7; i <= 7; i++) M.quad([i * 4, .03, 30.4], [i * 4 + 2, .03, 30.4], [i * 4 + 2, .03, 29.2], [i * 4, .03, 29.2]);
    for (let i = -7; i <= 7; i++) M.quad([-30.4, .03, i * 4], [-30.4, .03, i * 4 + 2], [-29.2, .03, i * 4 + 2], [-29.2, .03, i * 4]);
    const cols = [0xb03a3a, 0x2a6a7a, 0xc99a3a, 0x7a7684, 0x3a5a3a, 0xa04a8a];
    for (const [cx, cz, n] of [[-22, 25, 3], [-13, 26, 2], [-3, 25, 1], [-24, 12, 2]]) for (let k = 0; k < n; k++) { const c = R.pick(cols); setPlain(M, c); M.box(cx, k * 2.6, cz, 8, 2.5, 3.2, { topc: mixC(c, 0x000000, .3) }); setPlain(M, mixC(c, 0x000000, .4)); for (let j = -3; j <= 3; j++) M.box(cx + j * 1.1, k * 2.6 + .15, cz + 1.62, .35, 2.2, .04, {}); }
    for (const [lx, lz] of [[-28, 28], [-28, 0], [0, 28], [14, 28]]) { setPlain(M, 0x262432); M.cyl(lx, 0, lz, .16, .1, 9, 5, { c: 0x262432, top: false }); M.box(lx, 8.9, lz, 1.4, .14, .3, {}); M.set({ kind: K.PLAIN, c: hex(0xffe2b0), em: 255 }); M.box(lx, 8.82, lz, 1.1, .06, .22, {}); M.set({ em: 0 }); }
    /* drums, a coil of hose, netting, a hut with a lit window */
    for (let i = 0; i < 9; i++) { const c = R.pick([0x2a4a44, 0x7a2a2a, 0x3a3a48]); M.cyl(-6 + R.range(-3, 3) + i * .9, 0, 14 + R.range(-3, 3), .5, .5, 1.2, 8, { c }); }
    setPlain(M, 0x4a4852); M.box(6, 0, 22, 7, 3, 4.6, { topc: 0x2a2a30 }); M.set({ kind: K.PLAIN, c: hex(0xffd8a0), em: 240 }); M.box(6, 1.2, 24.32, 3.4, 1, .04, {}); M.set({ em: 0 });
  });
  const cs = Math.cos(ry), sn = Math.sin(ry); for (const [lx, lz] of [[-28, 28], [-28, 0], [0, 28], [14, 28]]) { const wx = x + lx * cs + lz * sn, wz = z - lx * sn + lz * cs; glow(wx, 14.6, wz, 0xffc880, 6.5); pool(wx, wz, 22, 0xffc880, .7); }
}
/* boats moored close in, their lights lie on the water */
function nearBoats(M, R) {
  /* the water taxi: long low hull, a strip of warm windows, a red tail */
  M.at(-6, -2, 330, 1.48, () => { setPlain(M, 0x1c2230); M.loft([[[-3.2, 0, -19], [3.2, 0, -19], [1.6, 0, 19], [-1.6, 0, 19]], [[-3.8, 2.2, -20], [3.8, 2.2, -20], [.3, 2.8, 25], [-.3, 2.8, 25]]], { c: 0x1c2230 }); setPlain(M, 0x2a3244); M.loft([[[-3.8, 2.2, -20], [3.8, 2.2, -20], [.3, 2.8, 25], [-.3, 2.8, 25]], [[-2.6, 2.4, -16], [2.6, 2.4, -16], [1.4, 2.6, 14], [-1.4, 2.6, 14]]], { c: 0x2a3244 }); setPlain(M, 0x3a4256); M.box(0, 2.4, -2, 4.6, 2.6, 26, { topc: 0x1a2030 }); M.set({ kind: K.PLAIN, em: 240, c: hex(0xffd8a0) }); for (let i = 0; i < 13; i++) { M.box(2.32, 3.1, -13.5 + i * 1.9, .03, 1.1, 1.5, {}); M.box(-2.32, 3.1, -13.5 + i * 1.9, .03, 1.1, 1.5, {}); } M.set({ em: 0 }); setPlain(M, 0x1a2030); M.box(0, 5, -2, 4.9, .12, 26.4, {}); M.set({ kind: K.NEON, c: hex(PAL.cyan), seed: 0 }); for (const sx of [-2.46, 2.46]) M.box(sx, 4.98, -2, .06, .06, 26, {}); setPlain(M, 0x25283a); M.cyl(0, 5, 6, .1, .05, 6, 4, { top: false }); });
  glow(-6, 3.2, 330, 0xffc880, 32); glow(-29, 3, 332, PAL.red, 5, 1); glow(16, 3, 329, 0xffffff, 5);
  for (const [x, z, ry, L0, c, lc] of [[-70, 348, -.5, 18, 0x24384a, PAL.cyan], [34, 334, 1.2, 15, 0x2a4a44, 0xff8a5a], [-96, 340, .9, 24, 0xb09a78, PAL.magenta]]) {
    M.at(x, -2, z, ry, () => { const w = L0 * .24; setPlain(M, c); const a = [[-w * .7, 0, -L0 / 2], [w * .7, 0, -L0 / 2], [w * .25, 0, L0 / 2], [-w * .25, 0, L0 / 2]], b = [[-w, 1.8, -L0 / 2], [w, 1.8, -L0 / 2], [w * .1, 2.4, L0 * .62], [-w * .1, 2.4, L0 * .62]]; M.loft([a, b], { c }); M.loft([b, b.map(() => [0, 1.8, 0])], { c: mixC(c, 0xffffff, .2) }); M.box(0, 1.8, -L0 * .12, w * 1.1, 2.8, L0 * .34, { c: 0x6a6670 }); M.set({ kind: K.PLAIN, em: 235, c: hex(lc) }); M.box(0, 3.1, -L0 * .12, w * 1.16, .8, L0 * .3, {}); M.set({ em: 0 }); setPlain(M, 0x25283a); M.cyl(0, 4.6, -L0 * .12, .08, .05, 5, 4, { top: false }); });
    glow(x, 2.8, z, lc, 14); glow(x, 9, z, PAL.red, 3, 1);
  }
}

/* ---------- second pass of city dressing: vehicles, people, pillars, the near tower, the hologram ---------- */

/* geometry helper for instanced props: x side, y up, z forward; tag 0 own colour, 1 paint, 2 glass, 3 light */
function propBuilder() {
  const pos = [], nor = [], col = [];
  const tri = (a, b, c, co, tag) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n) || 1; for (const p of [a, b, c]) { pos.push(...p); nor.push(n[0] / l, n[1] / l, n[2] / l); col.push(co[0] * 255, co[1] * 255, co[2] * 255, tag); } };
  const q = (a, b, c, d, co, tag) => { tri(a, b, c, co, tag); tri(a, c, d, co, tag); };
  const box = (x, y, z, w, h, d, co, tag) => { const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, y1 = y + h; q([x0, y, z1], [x1, y, z1], [x1, y1, z1], [x0, y1, z1], co, tag); q([x1, y, z0], [x0, y, z0], [x0, y1, z0], [x1, y1, z0], co, tag); q([x1, y, z1], [x1, y, z0], [x1, y1, z0], [x1, y1, z1], co, tag); q([x0, y, z0], [x0, y, z1], [x0, y1, z1], [x0, y1, z0], co, tag); q([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], co, tag); };
  const ringY = (x, y, z, r0, r1, y1, seg, co, tag, cap = true) => { for (let i = 0; i < seg; i++) { const a = i / seg * TAU, b = (i + 1) / seg * TAU, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b); q([x + ca * r0, y, z + sa * r0], [x + cb * r0, y, z + sb * r0], [x + cb * r1, y1, z + sb * r1], [x + ca * r1, y1, z + sa * r1], co, tag); if (cap && r1 > 0) tri([x, y1, z], [x + ca * r1, y1, z + sa * r1], [x + cb * r1, y1, z + sb * r1], co, tag); } };
  const triN = (a, b, c, na, nb, nc, co, tag) => { const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], gn = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const flip = gn[0] * (na[0] + nb[0] + nc[0]) + gn[1] * (na[1] + nb[1] + nc[1]) + gn[2] * (na[2] + nb[2] + nc[2]) < 0; const L = flip ? [[a, na], [c, nc], [b, nb]] : [[a, na], [b, nb], [c, nc]]; for (const [p, n] of L) { pos.push(...p); nor.push(...n); col.push(co[0] * 255, co[1] * 255, co[2] * 255, tag); } };
  const geom = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3)); g.setAttribute('aCol', new THREE.BufferAttribute(new Uint8Array(col), 4, true)); return g; };
  return { tri, triN, q, box, ringY, geom, n: () => pos.length / 9 };
}

/* three street cars with real silhouettes */
function carModel(kind) {
  const B = propBuilder(); const { tri, q, box } = B;
  const dk = [.018, .018, .024], tr = [.05, .05, .06], rim = [.3, .31, .34], hd = [1, .98, .9], tl = [1, .07, .05], am = [1, .55, .1], cy = [.2, .95, 1];
  /* upper outline, nose to tail: [z, y, glass?] */
  const specs = {
    muscle: { W: 1.02, sill: .3, wz: 1.52, wr: .37, belt: 1.0, ins: .74, prof: [[2.5, .36, 0], [2.46, .62, 0], [1.05, .84, 0], [.4, 1.24, 1], [-.65, 1.28, 0], [-1.85, .98, 1], [-2.42, .92, 0], [-2.48, .4, 0]] },
    cab: { W: .96, sill: .34, wz: 1.34, wr: .36, belt: 1.0, ins: .86, prof: [[2.2, .42, 0], [2.17, .84, 0], [1.42, .98, 0], [.96, 1.72, 1], [-1.62, 1.76, 0], [-2.08, .99, 1], [-2.16, .96, 0], [-2.2, .42, 0]] },
    sedan: { W: 1.06, sill: .4, wz: 1.46, wr: .4, belt: 1.2, ins: .78, prof: [[2.42, .5, 0], [2.36, .94, 0], [1.02, 1.16, 0], [.58, 1.56, 1], [-1.24, 1.6, 0], [-1.92, 1.18, 1], [-2.42, 1.14, 0], [-2.46, .5, 0]] },
  };
  const S = specs[kind]; const { W, prof } = S; const insAt = y => y > S.belt ? S.ins : 1;
  /* the shell: stations from nose to tail, each a rounded section with shared normals */
  { const zN = prof[0][0], zT = prof[prof.length - 1][0], NS = 20, mz0 = (zN + zT) / 2, mzH = (zN - zT) / 2;
    const raw = z => { for (let i = 0; i < prof.length - 1; i++) { const [a, ya] = prof[i], [b, yb] = prof[i + 1]; if (z <= a && z >= b) return lerp(ya, yb, (a - z) / ((a - b) || 1)); } return prof[z > mz0 ? 0 : prof.length - 1][1]; };
    const topAt = z => (raw(z - .16) + raw(z) * 2 + raw(z + .16)) / 4;
    const secs = []; for (let i = 0; i <= NS; i++) { const z = lerp(zN, zT, i / NS), t = topAt(z), wz = W * (1 - .09 * Math.pow(Math.abs((z - mz0) / mzH), 3)); const b = Math.min(S.belt, t - .01), gh = t > S.belt + .05; const inR = gh ? wz * S.ins : wz * .86; const half = [[wz * .95, S.sill], [wz, S.sill + (b - S.sill) * .3], [wz, S.sill + (b - S.sill) * .8], [wz * .97, b], gh ? [lerp(wz * .97, inR, .6), lerp(b, t, .62)] : [wz * .92, lerp(b, t, .6)], [inR * .96, t - .03], [inR * .55, t], [0, t + .012]]; const ring = []; for (let j = 0; j < 8; j++) ring.push([half[j][0], half[j][1], z]); for (let j = 6; j >= 0; j--) ring.push([-half[j][0], half[j][1], z]); secs.push({ ring, gh, z }); }
    const rn = secs[0].ring.length; const N = secs.map(() => new Array(rn));
    for (let i = 0; i <= NS; i++) for (let j = 0; j < rn; j++) { const A = secs[Math.min(i + 1, NS)].ring[j], B = secs[Math.max(i - 1, 0)].ring[j], C = secs[i].ring[Math.min(j + 1, rn - 1)], D = secs[i].ring[Math.max(j - 1, 0)]; const u = [A[0] - B[0], A[1] - B[1], A[2] - B[2]], v = [C[0] - D[0], C[1] - D[1], C[2] - D[2]]; let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; const P = secs[i].ring[j], o = [P[0], P[1] - (S.sill + 1) * .5, 0]; if (n[0] * o[0] + n[1] * o[1] + n[2] * o[2] < 0) n = n.map(q => -q); const l = Math.hypot(...n) || 1; N[i][j] = n.map(q => q / l); }
    const glassZ = z => { for (let i = 0; i < prof.length - 1; i++) if (prof[i + 1][2] === 1 && z <= prof[i][0] && z >= prof[i + 1][0]) return true; return false; };
    for (let i = 0; i < NS; i++) for (let j = 0; j < rn - 1; j++) { const a = secs[i].ring[j], b = secs[i].ring[j + 1], c = secs[i + 1].ring[j + 1], d0 = secs[i + 1].ring[j]; const k = j > 7 ? 13 - j : j; const zm = (secs[i].z + secs[i + 1].z) / 2; const both = secs[i].gh && secs[i + 1].gh; const side = both && k === 3 || both && k === 4; const top = k >= 5 && glassZ(zm); const g = side || top; const co = g ? [0, 0, 0] : [.5, .5, .5], tag = g ? 2 : 1; B.triN(a, b, c, N[i][j], N[i][j + 1], N[i + 1][j + 1], co, tag); B.triN(a, c, d0, N[i][j], N[i + 1][j + 1], N[i + 1][j], co, tag); }
    /* nose and tail caps */
    for (const [e, zz] of [[0, 1], [NS, -1]]) { const r = secs[e].ring, nn = [0, 0, zz], c = [0, (S.sill + topAt(secs[e].z)) / 2, secs[e].z]; for (let j = 0; j < rn - 1; j++) B.triN(c, r[j], r[j + 1], nn, nn, nn, [.5, .5, .5], 1); B.triN(c, r[rn - 1], r[0], nn, nn, nn, dk, 0); }
  }
  /* sides */
  for (const s of [1, -1]) {
    { const a = prof[3], b = prof[4]; const yb = S.belt; const mz = (a[0] + b[0]) / 2 - .1; q([s * (W + .005), yb, mz - .05], [s * (W + .005), yb, mz + .05], [s * (W * S.ins + .01), a[1] - .04, mz + .05], [s * (W * S.ins + .01), a[1] - .04, mz - .05], dk, 0); }
    /* sill, belt trim, door seam, handle */
    q([s * (W + .01), S.sill - .04, 2], [s * (W + .01), S.sill - .04, -2], [s * (W + .01), S.sill + .08, -2], [s * (W + .01), S.sill + .08, 2], dk, 0);
    q([s * (W + .006), S.belt - .02, 1.1], [s * (W + .006), S.belt - .02, -1.7], [s * (W + .006), S.belt + .012, -1.7], [s * (W + .006), S.belt + .012, 1.1], tr, 0);
    for (const dz of [.5, -.62]) q([s * (W + .006), S.sill + .08, dz - .012], [s * (W + .006), S.sill + .08, dz + .012], [s * (W + .006), S.belt, dz + .012], [s * (W + .006), S.belt, dz - .012], dk, 0);
    q([s * (W + .012), S.belt - .14, .2], [s * (W + .012), S.belt - .14, .36], [s * (W + .012), S.belt - .1, .36], [s * (W + .012), S.belt - .1, .2], rim, 0);
    /* wheels under flared arches */
    for (const wz of [S.wz, -S.wz]) {
      const seg = 10, r = S.wr, x0 = s * (W + .004), xa = s * (W + .016);
      for (let i = 0; i < 6; i++) { const a0 = Math.PI * i / 6, a1 = Math.PI * (i + 1) / 6; const P = (a, rr, x) => [x, S.wr - .02 + Math.sin(a) * rr, wz + Math.cos(a) * rr]; q(P(a0, r + .03, xa), P(a1, r + .03, xa), P(a1, r + .13, xa), P(a0, r + .13, xa), tr, 0); }
      for (let i = 0; i < seg; i++) { const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU; const yc = r - .02; const P = (a, rr) => [xa + s * .004, yc + Math.sin(a) * rr, wz + Math.cos(a) * rr]; tri(P(a0, 0), P(a0, r), P(a1, r), dk, 0); tri(P(a0, 0), P(a0, r * .52), P(a1, r * .52), rim, 0); }
    }
    /* mirror and side marker */
    box(s * (W + .08), S.belt + .02, prof[2][0] - .35, .14, .08, .1, dk, 0);
    q([s * (W + .008), S.belt - .22, prof[1][0] - .25], [s * (W + .008), S.belt - .22, prof[1][0] - .05], [s * (W + .008), S.belt - .18, prof[1][0] - .05], [s * (W + .008), S.belt - .18, prof[1][0] - .25], am, 3);
  }
  /* underside, nose and tail */
  const zf = prof[0][0], zr = prof[prof.length - 1][0], yf = prof[1][1], yr = prof[prof.length - 2][1];
  q([-W, S.sill, zf], [W, S.sill, zf], [W, S.sill, zr], [-W, S.sill, zr], dk, 0);
  q([W * .86, S.sill, zf + .004], [-W * .86, S.sill, zf + .004], [-W * .86, prof[0][1] + .02, zf + .004], [W * .86, prof[0][1] + .02, zf + .004], dk, 0); q([-W * .86, S.sill, zr - .004], [W * .86, S.sill, zr - .004], [W * .86, prof[prof.length - 1][1] + .02, zr - .004], [-W * .86, prof[prof.length - 1][1] + .02, zr - .004], dk, 0);
  q([W * .86, yf - .18, zf + .012], [-W * .86, yf - .18, zf + .012], [-W * .86, yf - .12, zf + .012], [W * .86, yf - .12, zf + .012], hd, 3);
  q([-W * .88, yr - .2, zr - .012], [W * .88, yr - .2, zr - .012], [W * .88, yr - .14, zr - .012], [-W * .88, yr - .14, zr - .012], tl, 3);
  q([-W * .82, yr - .38, zr - .012], [W * .82, yr - .38, zr - .012], [W * .82, yr - .34, zr - .012], [-W * .82, yr - .34, zr - .012], tr, 0);
  /* grille bars */
  for (let i = -3; i <= 3; i++) box(i * .22, prof[0][1] + .02, zf + .006, .05, .14, .02, tr, 0);
  /* per kind */
  if (kind === 'muscle') { box(0, prof[6][1] + .08, zr + .22, W * 1.9, .05, .3, dk, 0); for (const s of [1, -1]) box(s * W * .84, prof[6][1], zr + .22, .05, .1, .24, dk, 0); box(0, .88, 1.5, .62, .08, .9, tr, 0); box(0, .96, 1.5, .5, .012, .7, dk, 0); }
  if (kind === 'cab') { box(0, 1.76, -.3, .72, .24, .3, [1, .92, .1], 3); box(0, 1.76, -.3, .78, .02, .36, dk, 0); for (let i = 0; i < 9; i++) for (const s of [1, -1]) q([s * (W + .014), .62, 1.0 - i * .34], [s * (W + .014), .62, .84 - i * .34], [s * (W + .014), .76, .84 - i * .34], [s * (W + .014), .76, 1.0 - i * .34], i % 2 ? [.95, .85, .1] : dk, 0); }
  if (kind === 'sedan') { for (const s of [1, -1]) box(s * (W + .03), .3, 0, .06, .3, 3, tr, 0); box(0, prof[1][1] - .06, zf + .1, W * 1.8, .1, .08, tr, 0); box(0, prof[0][1] - .16, zf + .1, W * 1.8, .1, .08, tr, 0); for (let i = 0; i < 4; i++) box(-.45 + i * .3, 1.04, 1.5, .18, .03, .5, dk, 0); box(0, 1.6, -.5, .3, .06, .5, cy, 3); }
  return B.geom();
}
/* a flyer: wedge body, four vector pods, thin light under the hull */
function flyerModel() {
  const B = propBuilder(); const { q, box, ringY } = B;
  const dk = [.02, .02, .03], tr = [.06, .065, .08], hd = [1, .98, .9], tl = [1, .07, .05], cy = [.2, .95, 1];
  const W = 1.05, prof = [[2.6, .5, 0], [2.5, .8, 0], [1.1, 1.02, 0], [.5, 1.46, 1], [-1, 1.5, 0], [-1.9, 1.1, 1], [-2.5, 1.02, 0], [-2.6, .55, 0]];
  for (let i = 0; i < prof.length - 1; i++) { const [z0, y0] = prof[i], [z1, y1] = prof[i + 1]; const g = prof[i + 1][2] === 1, i0 = y0 > 1.05 ? .72 : 1, i1 = y1 > 1.05 ? .72 : 1; q([W * i0, y0, z0], [W * i1, y1, z1], [-W * i1, y1, z1], [-W * i0, y0, z0], g ? [0, 0, 0] : [.5, .5, .5], g ? 2 : 1); for (const s of [1, -1]) { q([s * W, .46, z0], [s * W, .46, z1], [s * W * Math.min(i1, 1), Math.min(y1, 1.05), z1], [s * W * Math.min(i0, 1), Math.min(y0, 1.05), z0], [.5, .5, .5], 1); } }
  for (const s of [1, -1]) { q([s * (W + .01), .72, 1], [s * (W + .01), .72, -1.9], [s * (W * .74), 1.4, -1], [s * (W * .74), 1.4, .5], [0, 0, 0], 2); q([s * (W + .012), .56, 2.2], [s * (W + .012), .56, -2.3], [s * (W + .012), .6, -2.3], [s * (W + .012), .6, 2.2], cy, 3); }
  q([W, .46, 2.6], [-W, .46, 2.6], [-W, .46, -2.6], [W, .46, -2.6], dk, 0);
  q([W * .9, .7, 2.62], [-W * .9, .7, 2.62], [-W * .9, .76, 2.62], [W * .9, .76, 2.62], hd, 3); q([-W * .9, .8, -2.62], [W * .9, .8, -2.62], [W * .9, .88, -2.62], [-W * .9, .88, -2.62], tl, 3);
  for (const sx of [1, -1]) for (const sz of [1.7, -1.7]) { box(sx * 1.04, .62, sz, .44, .1, .16, tr, 0); ringY(sx * 1.45, .3, sz, .36, .32, .72, 8, tr, 0, false); ringY(sx * 1.45, .28, sz, .34, .34, .3, 8, [.2, .8, 1], 3); }
  return B.geom();
}
/* far cars stay cheap */
function carLow() {
  const B = propBuilder(); const { q, box } = B; const W = .98, gl = [0, 0, 0];
  box(0, .26, 0, W * 2, .6, 4.6, [.5, .5, .5], 1); q([W * .8, .86, 1], [W * .7, 1.26, .3], [-W * .7, 1.26, .3], [-W * .8, .86, 1], gl, 2); box(0, .86, -.6, W * 1.6, .38, 2.2, gl, 2); box(0, 1.24, -.6, W * 1.45, .03, 1.8, [.5, .5, .5], 1);
  q([W, .6, 2.31], [-W, .6, 2.31], [-W, .68, 2.31], [W, .68, 2.31], [1, .98, .9], 3); q([-W, .62, -2.31], [W, .62, -2.31], [W, .7, -2.31], [-W, .7, -2.31], [1, .07, .05], 3);
  return B.geom();
}
/* people: seen small at street distance, drawn like the crowd in a painted night scene.
   Every part is a smooth loft whose rings carry bone weights for the walk in CAR_VS. x side, y up, z forward, about 1.72 tall */
function personBuilder() {
  const pos = [], nor = [], col = [], rig = [];
  const put = (p, n, co, tag, pid, part, r) => { pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]); col.push(co[0] * 255, co[1] * 255, co[2] * 255, tag + pid * 4); rig.push(part, r[0] || 0, r[1] || 0, r[2] || 0); };
  /* rings run upward: [cx, y, cz, rx, rz, w1, w2, w3]; with o.fwd they run forward: [cx, cy, z, rx, ry, ...] */
  const loft = (rings, seg, co, tag, pid, part, o = {}) => {
    const a0 = o.a0 || 0, fl = !!o.fwd, fy = o.floor === undefined ? -9 : o.floor;
    const G = rings.map(r => { const row = []; for (let j = 0; j < seg; j++) { const a = a0 + j / seg * TAU, ca = Math.cos(a), sa = Math.sin(a); row.push(fl ? [r[0] + ca * r[3], Math.max(r[1] + sa * r[4], fy), r[2]] : [r[0] + ca * r[3], r[1], r[2] + sa * r[4]]); } return row; });
    const N = rings.map(() => Array.from({ length: seg }, () => [0, 0, 0])), sg = fl ? -1 : 1;
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < seg; j++) {
      const k = (j + 1) % seg, a = G[i][j], b = G[i + 1][j], c = G[i][k], d = G[i + 1][k];
      const u = [d[0] - a[0], d[1] - a[1], d[2] - a[2]], v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
      const n = [(u[1] * v[2] - u[2] * v[1]) * sg, (u[2] * v[0] - u[0] * v[2]) * sg, (u[0] * v[1] - u[1] * v[0]) * sg];
      for (const [I, J] of [[i, j], [i + 1, j], [i, k], [i + 1, k]]) { const m = N[I][J]; m[0] += n[0]; m[1] += n[1]; m[2] += n[2]; }
    }
    for (const row of N) for (const m of row) { const l = Math.hypot(m[0], m[1], m[2]) || 1; m[0] /= l; m[1] /= l; m[2] /= l; }
    const W = i => rings[i].slice(5);
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < seg; j++) {
      const k = (j + 1) % seg, F = o.face ? o.face(i, j) : null, cc = F ? F[0] : co, tg = F ? F[1] : tag, pd = F && F[2] !== undefined ? F[2] : pid;
      const V = fl ? [[i, j], [i, k], [i + 1, j], [i, k], [i + 1, k], [i + 1, j]] : [[i, j], [i + 1, j], [i, k], [i, k], [i + 1, j], [i + 1, k]];
      for (const [I, J] of V) put(G[I][J], N[I][J], cc, tg, pd, part, W(I));
    }
    const cap = (I, top) => { const r = rings[I], c = fl ? [r[0], Math.max(r[1], fy), r[2]] : [r[0], r[1], r[2]], cn = fl ? [0, 0, top ? 1 : -1] : [0, top ? 1 : -1, 0], w = W(I); for (let j = 0; j < seg; j++) { const k = (j + 1) % seg, ord = top !== fl ? [k, j] : [j, k]; put(c, cn, co, tag, pid, part, w); for (const J of ord) put(G[I][J], N[I][J], co, tag, pid, part, w); } };
    if (o.top) cap(rings.length - 1, true); if (o.bot) cap(0, false);
  };
  const geom = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3)); g.setAttribute('aCol', new THREE.BufferAttribute(new Uint8Array(col), 4, true)); g.setAttribute('aRig', new THREE.BufferAttribute(new Float32Array(rig), 4)); return g; };
  const flat = (a, b, c, co, tag, pid) => { const n = [0, .2, .98], w = []; for (const p of [a, b, c]) put(p, n, co, tag, pid, 0, w); };
  return { loft, flat, geom };
}
/* dry: the two umbrella cuts with the umbrella put away and the arm down, shown while it isn't raining */
function pedModel(v, dry) {
  const { loft, flat, geom } = personBuilder();
  const P = [.5, .5, .5], CY = [.15, .9, 1], MG = [1, .22, .55], AM = [1, .66, .16], LM = [.55, 1, .3];
  /* ink ids: 1 torso, 2 legs, 3 shoes, 4 arms, 5 skin, 6 hair, 7 kit, 8 skirt */
  const skin = [[.74, .52, .42], [.5, .33, .25], [.82, .62, .5], [.62, .42, .32]][v % 4];
  const shadow = () => loft([[0, .012, .01, .19, .27], [0, .012, .01, .002, .002]], 11, [.016, .013, .024], 0, 0, 5);
  const leg = (s, c, tag, wide = 0, top = .9) => {
    const rs = [[s * .076, .085, -.004, .034 + wide, .04 + wide, 1, 1], [s * .078, .3, -.016, .05 + wide * .8, .056 + wide * .8, 1, 1], [s * .08, .47, .006, .05 + wide * .5, .056 + wide * .5, 1, .5], [s * .085, .68, 0, .068 + wide * .3, .076 + wide * .3, 1, 0], [s * .085, .9, 0, .08, .088, 1, 0]].filter(r => r[1] <= top);
    loft(rs, 6, c, tag, 2, s);
  };
  const shoe = (s, c) => loft([[s * .076, .05, -.075, .03, .05, 1, 1, 1], [s * .076, .06, .015, .044, .06, 1, 1, 1], [s * .08, .034, .16, .038, .034, 1, 1, 1]], 5, c, 0, 3, s, { fwd: 1, top: 1, floor: 0 });
  const arm = (s, c, tag, w = 1, cuff = 0) => {
    loft([[s * .208 * w, .875, .012, .027 + cuff, .03 + cuff, 1, 1], [s * .208 * w, 1, .006, .035 + cuff * .6, .039 + cuff * .6, 1, 1], [s * .206 * w, 1.12, 0, .037, .042, 1, .5], [s * .202 * w, 1.27, 0, .045, .05, 1, 0], [s * .193 * w, 1.375, 0, .05, .054, 1, 0], [s * .165 * w, 1.44, 0, .03, .036, .75, 0]], 5, c, tag, 4, s * 2, { top: 1 });
    loft([[s * .21 * w, .785, .018, .014, .022, 1, 1], [s * .21 * w, .835, .014, .025, .032, 1, 1], [s * .208 * w, .875, .012, .021, .026, 1, 1]], 4, skin, 0, 5, s * 2, { bot: 1 });
  };
  /* an arm up to a held handle: no swing, it belongs to the body */
  const holdArm = (s, c, tag, hx, hy, hz) => {
    loft([[s * .24, 1.14, .08, .04, .042], [s * .225, 1.27, .03, .047, .05], [s * .193, 1.375, 0, .05, .054], [s * .165, 1.44, 0, .03, .036]], 5, c, tag, 4, 0, { top: 1 });
    loft([[s * .24, 1.1, .08, .036, .04], [(s * .24 + hx) / 2, (1.1 + hy) / 2, (.08 + hz) / 2, .036, .036], [hx, hy, hz, .03, .03]], 5, c, tag, 4, 0);
    loft([[hx, hy - .01, hz, .026, .026], [hx, hy + .05, hz, .03, .03], [hx, hy + .09, hz, .018, .02]], 4, skin, 0, 5, 0, { top: 1 });
  };
  const neck = () => loft([[0, 1.43, -.008, .05, .05], [0, 1.52, -.002, .042, .044]], 6, skin, 0, 5, 0);
  const head = () => loft([[0, 1.49, .014, .03, .034], [0, 1.53, .01, .068, .074], [0, 1.6, 0, .088, .098], [0, 1.67, -.006, .082, .094], [0, 1.715, -.006, .036, .044]], 7, skin, 0, 5, 0, { top: 1 });
  const hair = {
    bob: c => loft([[0, 1.45, -.042, .098, .068], [0, 1.53, -.038, .116, .09], [0, 1.62, -.024, .108, .108], [0, 1.695, -.01, .09, .104], [0, 1.74, -.004, .04, .05]], 8, c, 0, 6, 0, { top: 1 }),
    crop: c => loft([[0, 1.585, -.03, .094, .082], [0, 1.655, -.012, .094, .108], [0, 1.72, .004, .074, .094], [0, 1.755, .012, .03, .04]], 7, c, 0, 6, 0, { top: 1 }),
    long: c => loft([[0, 1.14, -.082, .07, .03], [0, 1.3, -.075, .118, .05], [0, 1.46, -.05, .115, .068], [0, 1.6, -.026, .108, .106], [0, 1.695, -.01, .09, .104], [0, 1.74, -.004, .04, .05]], 8, c, 0, 6, 0, { top: 1 }),
    pony: c => { hair.crop(c); loft([[0, 1.25, -.2, .012, .012], [.005, 1.36, -.19, .04, .034], [0, 1.52, -.16, .045, .038], [0, 1.68, -.1, .03, .03]], 5, c, 0, 6, 0, { top: 1, bot: 1 }); },
    bun: c => { hair.crop(c); loft([[0, 1.69, -.1, .03, .03], [0, 1.74, -.11, .058, .058], [0, 1.81, -.1, .022, .022]], 5, c, 0, 6, 0, { top: 1 }); },
  };
  const torso = (c, tag, w = 1, face) => loft([[0, .9, 0, .15 * w, .1], [0, 1.08, 0, .115 * w, .083], [0, 1.27, .006, .162 * w, .108], [0, 1.4, 0, .162 * w, .088], [0, 1.465, -.004, .06, .056]], 8, c, tag, 1, 0, { face });
  /* a cropped jacket: a hem wider than the waist */
  const jacket = (c, tag, w, hem, face, under = [.05, .05, .07]) => { if (hem > .92) loft([[0, .9, 0, .148 * w, .1], [0, hem, 0, .118 * w, .084]], 8, under, 0, 2, 0); loft([[0, hem, 0, .152 * w, .112], [0, 1.27, .006, .165 * w, .114], [0, 1.4, 0, .165 * w, .09], [0, 1.465, -.004, .06, .056]], 8, c, tag, 1, 0, { face }); };
  const collar = (c, tag, hi = .1) => loft([[0, 1.42, -.006, .078, .072], [0, 1.42 + hi, -.012, .098, .09]], 7, c, tag, 7, 0);
  /* long skirts and coat tails: the hem follows the legs */
  const skirt = (c, tag, hem, flare, face) => { const f = 1.06 - hem, r = t => .118 + flare * t; loft([[0, hem, -.012 * f, r(1), r(1) * .86, 1], [0, hem + f * .36, -.006 * f, r(.5), r(.5) * .85, .55], [0, hem + f * .72, 0, r(.16), r(.16) * .85, .18], [0, 1.06, 0, .118, .088, 0]], 8, c, tag, 8, 3, { face }); };
  const umbrella = (x, z, co) => {
    loft([[x + .02, 1.3, z + .05, .012, .012], [x, 2.1, z, .01, .01]], 3, [.03, .03, .04], 0, 7, 0);
    loft([[x, 1.915, z, .7, .7], [x, 1.93, z, .695, .695]], 10, co, 3, 7, 0);
    loft([[x, 1.93, z, .695, .695], [x, 2.09, z, .48, .48], [x, 2.2, z, .08, .08]], 10, P, 1, 7, 0, { top: 1 });
  };
  shadow();
  if (v === 0) { /* long belted coat, high collar, bob */
    leg(1, [.05, .05, .07], 0, 0, .68); leg(-1, [.05, .05, .07], 0, 0, .68); shoe(1, [.03, .03, .04]); shoe(-1, [.03, .03, .04]);
    skirt(P, 1, .42, .17); torso(P, 1, .94);
    loft([[0, 1.04, 0, .118, .088], [0, 1.085, 0, .116, .086]], 8, [.03, .03, .04], 0, 7, 0);
    arm(1, P, 1, .94, .006); arm(-1, P, 1, .94, .006); neck(); head(); hair.bob([.06, .05, .09]); collar(P, 1, .085);
    loft([[0, .418, -.0077, .292, .252, .98], [0, .445, -.0072, .278, .24, .94]], 8, CY, 3, 8, 3);
  } else if (v === 1) { /* cropped jacket with a stand collar, slim trousers, undercut, lit visor */
    const panel = (i, j) => j === 1 && i < 2 ? [[.86, .13, .22], 0, 7] : null;
    leg(1, [.05, .055, .08], 0); leg(-1, [.05, .055, .08], 0); shoe(1, [.72, .72, .76]); shoe(-1, [.72, .72, .76]);
    jacket(P, 1, 1, 1.03, panel); arm(1, P, 1, 1, .008); arm(-1, P, 1, 1, .008); neck(); head(); hair.crop([.05, .24, .3]); collar(P, 1, .1);
    loft([[0, 1.595, .012, .09, .092], [0, 1.635, .012, .089, .094]], 7, CY, 3, 7, 0);
  } else if (v === 2) { /* hoodie, wide trousers, backpack with a light strip */
    leg(1, [.09, .1, .13], 0, .035); leg(-1, [.09, .1, .13], 0, .035); shoe(1, [.04, .04, .05]); shoe(-1, [.04, .04, .05]);
    torso(P, 1, 1.08, (i, j) => i === 0 && (j === 1 || j === 2) ? [[.05, .05, .07], 0, 7] : null);
    arm(1, P, 1, 1.05, .012); arm(-1, P, 1, 1.05, .012); neck(); head(); hair.crop([.04, .03, .05]);
    loft([[0, 1.4, -.05, .13, .1], [0, 1.5, -.055, .118, .105], [0, 1.62, -.036, .112, .118], [0, 1.72, -.024, .082, .096], [0, 1.755, -.024, .03, .03]], 8, P, 1, 7, 0, { top: 1 });
    loft([[0, .98, -.16, .135, .065], [0, 1.2, -.175, .15, .08], [0, 1.38, -.15, .115, .055]], 6, [.06, .06, .08], 0, 7, 0, { top: 1, bot: 1 });
    flat([-.08, 1.1, -.252], [.08, 1.1, -.252], [.08, 1.126, -.254], AM, 3, 7); flat([-.08, 1.1, -.252], [.08, 1.126, -.254], [-.08, 1.126, -.254], AM, 3, 7);
  } else if (v === 3) { /* pleated skirt, short jacket, ponytail, tote */
    leg(1, skin, 0, -.008, .78); leg(-1, skin, 0, -.008, .78); shoe(1, [.04, .03, .03]); shoe(-1, [.04, .03, .03]);
    skirt([.74, .68, .6], 0, .64, .15, (i, j) => j % 2 ? [[.56, .5, .46], 0, 8] : null);
    jacket(P, 1, .9, 1.04); arm(1, P, 1, .9); arm(-1, P, 1, .9); neck(); head(); hair.pony([.36, .14, .1]); collar(P, 1, .05);
    loft([[-.285, .88, -.015, .035, .13], [-.27, 1.12, -.015, .028, .115]], 6, MG, 0, 7, 0, { top: 1, bot: 1 });
    loft([[-.26, 1.12, -.015, .012, .012], [-.19, 1.42, 0, .01, .01]], 3, [.05, .05, .06], 0, 7, 0);
  } else if (v === 4) { /* long coat, open over dark, wide trousers, umbrella */
    leg(1, [.06, .06, .08], 0, .02, .68); leg(-1, [.06, .06, .08], 0, .02, .68); shoe(1, [.03, .03, .03]); shoe(-1, [.03, .03, .03]);
    skirt(P, 1, .36, .2, (i, j) => (j === 1 || j === 2) ? [[.05, .05, .07], 0, 2] : null);
    torso(P, 1, 1.02, (i, j) => (j === 1 || j === 2) && i < 3 ? [[.05, .05, .07], 0, 2] : null);
    arm(-1, P, 1, 1.02, .01); if (dry) arm(1, P, 1, 1.02, .01); else holdArm(1, P, 1, .13, 1.28, .22); neck(); head(); hair.crop([.05, .05, .06]); collar(P, 1, .07);
    if (!dry) umbrella(.1, .12, CY);
  } else if (v === 5) { /* bulky short jacket, cargo trousers, bun, cross-body bag */
    leg(1, [.2, .2, .17], 0, .012); leg(-1, [.2, .2, .17], 0, .012); shoe(1, [.1, .1, .12]); shoe(-1, [.1, .1, .12]);
    jacket(P, 1, 1.1, 1.0, (i, j) => i === 0 && (j === 0 || j === 3 || j === 4 || j === 7) ? [[.9, .7, .15], 0, 7] : null); arm(1, P, 1, 1.08, .018); arm(-1, P, 1, 1.08, .018); neck(); head(); hair.bun([.03, .03, .05]);
    collar([.9, .7, .15], 0, .075);
    loft([[.19, .86, .04, .1, .045], [.19, 1.02, .05, .105, .05]], 6, [.06, .05, .05], 0, 7, 0, { top: 1, bot: 1 });
    flat([.12, .93, .104], [.26, .93, .104], [.26, .948, .105], LM, 3, 7); flat([.12, .93, .104], [.26, .948, .105], [.12, .948, .105], LM, 3, 7);
  } else if (v === 6) { /* long flowing dress, long hair, lit-rim umbrella */
    leg(1, skin, 0, -.01, .3); leg(-1, skin, 0, -.01, .3); shoe(1, [.5, .1, .16]); shoe(-1, [.5, .1, .16]);
    skirt(P, 1, .22, .22); torso(P, 1, .88); arm(-1, skin, 0, .88, -.006); if (dry) arm(1, skin, 0, .88, -.006); else holdArm(1, skin, 0, .13, 1.26, .2); neck(); head(); hair.long([.08, .05, .16]);
    if (!dry) umbrella(.08, .1, MG);
  } else { /* a suit, a white shirt front, a briefcase */
    leg(1, [.05, .05, .07], 0, .006); leg(-1, [.05, .05, .07], 0, .006); shoe(1, [.03, .025, .025]); shoe(-1, [.03, .025, .025]);
    jacket(P, 1, 1.02, .86); flat([-.06, 1.42, .096], [.06, 1.42, .096], [0, 1.2, .132], [.8, .8, .82], 0, 7); flat([-.014, 1.41, .1], [.014, 1.41, .1], [0, 1.24, .135], [.5, .08, .1], 0, 3); arm(1, P, 1, 1.02); arm(-1, P, 1, 1.02); neck(); head(); hair.crop([.05, .04, .04]);
    loft([[.27, .6, .012, .13, .04, 1, 1], [.27, .8, .012, .13, .04, 1, 1]], 4, [.14, .08, .05], 0, 7, 2, { a0: Math.PI / 4, top: 1, bot: 1 });
  }
  return geom();
}

/* poster and sticker runs on a pillar or wall */
function pasteUp(M, x, y0, y1, z, ry, w, R) {
  const nx = Math.sin(ry), nz = Math.cos(ry), tx = Math.cos(ry), tz = -Math.sin(ry); const n = Math.max(2, Math.round((y1 - y0) * w * .55));
  const kindP = { kind: K.PAPER, em: 0, c: [.92, .92, .92] };
  for (let i = 0; i < n; i++) {
    const t = R(), off = R.range(-w * .42, w * .42), yy = R.range(y0, y1), lift = .02 + i * .0012;
    const px = x + tx * off + nx * lift, pz = z + tz * off + nz * lift;
    if (t < .45) { const h = R.range(.8, 1.5); M.plate(px, yy, pz, h * .72, h, ry, CELL['torn' + R.int(0, 3)], kindP); }
    else if (t < .75) { const h = R.range(.7, 1.2); M.plate(px, yy, pz, h * .67, h, ry, CELL[R.pick(CELL.posters)], kindP); }
    else { const h = R.range(.12, .3); M.plate(px, yy, pz, h, h, ry, CELL['stk' + R.int(0, 5)], kindP); }
  }
  /* spray on the base */
  const h = R.range(.8, 1.4); M.plate(x + nx * .02, R.range(.8, 1.5), z + nz * .02, Math.min(w * .95, h * 2.2), h, ry, CELL['graf' + R.int(0, 3)], kindP);
}
function dressPillar(M, x, z, w, H, R) {
  const hw = w / 2; for (const [ry, dx, dz] of [[0, 0, hw], [Math.PI, 0, -hw], [Math.PI / 2, hw, 0], [-Math.PI / 2, -hw, 0]]) pasteUp(M, x + dx, 1.2, Math.min(H * .5, 8), z + dz, ry, w, R);
  /* cable runs with clips and a box */
  const s = R.chance(.5) ? 1 : -1, cx = x + hw + .06, cz = z + s * hw * .5;
  for (let k = 0; k < 3; k++) M.tube([[cx, .2, cz + k * .08], [cx + .02, H * .4, cz + k * .08 + .03], [cx, H - 1, cz + k * .08]], .028 + k * .008, 6, 3, { c: 0x07070b });
  setPlain(M, 0x34343c); M.box(cx + .02, 2.6, cz, .22, .7, .5, {}); setPlain(M, 0x15151a); M.box(cx + .13, 2.72, cz, .02, .46, .36, {});
  for (let y = 1; y < H - 1; y += 1.8) { setPlain(M, 0x23232a); M.box(cx + .02, y, cz + .08, .1, .04, .34, { bot: false }); }
  neonStrip(M, x, H * .62, z + hw + .05, w * .8, .08, .04, R.pick([PAL.yellow, PAL.cyan, PAL.red]), R() * 200);
  /* cast seams, rust runs, a bolted steel band, a sprayed number */
  for (const [dx, dz, ww, dd] of [[0, hw + .012, w + .02, .02], [0, -hw - .012, w + .02, .02], [hw + .012, 0, .02, w + .02], [-hw - .012, 0, .02, w + .02]]) { for (let y = 2.4; y < H; y += 2.4) { setPlain(M, 0x2a2830); M.box(x + dx, y, z + dz, ww, .04, dd, { bot: false, top: false }); }
    for (let i = 0; i < 5; i++) { const t0 = R.range(-.4, .4), yy = R.range(.6, H - 3), ll = R.range(.8, 3), c = R.pick([0x4a2a1c, 0x2a2228, 0x54463a]); setPlain(M, c); const isZ = Math.abs(dz) > 1; M.box(x + dx * 1.004 + (isZ ? t0 * w : 0), yy, z + dz * 1.004 + (isZ ? 0 : t0 * w), isZ ? R.range(.05, .16) : .012, ll, isZ ? .012 : R.range(.05, .16), { bot: false, top: false }); } }
  setPlain(M, 0x3c3c46); M.box(x, H * .3, z, w + .12, .26, w + .12, {}); M.box(x, H * .3 + 1.9, z, w + .12, .12, w + .12, {}); M.set({ kind: K.BRASS, c: 0x6a6a74 }); for (let i = -2; i <= 2; i++) { M.box(x + i * .42, H * .3 + .1, z + hw + .07, .05, .05, .02, {}); M.box(x + i * .42, H * .3 + .1, z - hw - .07, .05, .05, .02, {}); }
  /* a roll shutter of a service cupboard on the side you pass */
  setPlain(M, 0x34343c); M.box(x - hw - .06, .5, z, .1, 1.5, 1.2, {}); setPlain(M, 0x20202a); for (let k = 0; k < 9; k++) M.box(x - hw - .115, .56 + k * .15, z, .012, .05, 1.08, {}); M.set({ kind: K.PLAIN, c: hex(0xc8a828) }); M.box(x - hw - .115, 1.92, z, .012, .1, 1.1, {});
  /* heavier conduit up the corner */
  M.cyl(x - hw - .1, 0, z + hw * .7, .05, .05, H - .5, 6, { c: 0x2a2a32, top: false }); for (let y = 1.4; y < H - 1; y += 2.2) { setPlain(M, 0x4a4a54); M.box(x - hw - .1, y, z + hw * .7, .15, .06, .15, {}); }
}

/* soft rounded bag with a tied neck */
function bag(M, x, y, z, r, c, R) {
  const idS = M.id; M.set({ kind: K.PLAIN, layer: 0, em: 0, c, id: M.nid() }); const rows = 5, seg = 7, sq = R.range(.72, .95); const pt = (j, i) => { const v = j / rows * Math.PI, a = i / seg * TAU, w = 1 + .1 * Math.sin(a * 3 + r * 40) ; return [x + Math.cos(a) * Math.sin(v) * r * w, y + (Math.cos(v) * sq + sq) * r, z + Math.sin(a) * Math.sin(v) * r * w]; };
  const nr = (p) => { const d = [p[0] - x, p[1] - y - sq * r, p[2] - z], l = Math.hypot(...d) || 1; return [d[0] / l, d[1] / l, d[2] / l]; };
  for (let j = 0; j < rows; j++) for (let i = 0; i < seg; i++) { const a = pt(j, i), b = pt(j, i + 1), e = pt(j + 1, i + 1), f = pt(j + 1, i); const sh = lerp(1, .68, j / rows); const s2 = lerp(1, .68, (j + 1) / rows); M.vx(a, nr(a), a[0], a[2], sh); M.vx(b, nr(b), b[0], b[2], sh); M.vx(e, nr(e), e[0], e[2], s2); M.vx(a, nr(a), a[0], a[2], sh); M.vx(e, nr(e), e[0], e[2], s2); M.vx(f, nr(f), f[0], f[2], s2); }
  M.cyl(x, y + 2 * sq * r - .02, z, r * .14, r * .22, r * .34, 5, { c }); M.id = idS;
}

/* things right outside the shop window, so looking around shifts them against the street */
function shopKerb(M, R) {
  const ex = SHOP.x + SHOP.w / 2;
  /* lamp post on the kerb, off centre */
  setPlain(M, 0x1c1c22); const lx = ex + 3.1, lz = SHOP.z - 1.9; M.cyl(lx, 0, lz, .1, .07, 7.4, 8, { c: 0x1c1c22, top: false }); M.box(lx, .0, lz, .34, .5, .34, { c: 0x25252c }); M.box(lx + .5, 7.3, lz, 1.5, .1, .16, {}); M.set({ kind: K.PLAIN, c: hex(0xffd6a0), em: 255 }); M.box(lx + .95, 7.22, lz, .6, .08, .16, {}); M.set({ em: 0 }); glow(lx + .95, 7.1, lz, 0xffb878, 4);
  pasteUp(M, lx, 1.2, 2.2, lz + .11, 0, .2, R);
  /* parking meter, planter with a thin tree, bench, bike */
  setPlain(M, 0x26262e); M.cyl(ex + 2.8, 0, SHOP.z + 2.9, .04, .04, 1.15, 5, { top: false }); M.box(ex + 2.8, 1.15, SHOP.z + 2.9, .18, .34, .14, {}); M.set({ kind: K.NEON, c: hex(PAL.cyan), seed: 0 }); M.box(ex + 2.71, 1.34, SHOP.z + 2.9, .01, .08, .1, {});
  setPlain(M, 0x2a2a30); M.box(ex + 3.4, 0, SHOP.z + .9, .9, .55, .9, {}); setPlain(M, 0x14141a); M.box(ex + 3.4, .55, SHOP.z + .9, .78, .04, .78, {}); M.cyl(ex + 3.4, .55, SHOP.z + .9, .05, .03, 2.1, 5, { c: 0x161210, top: false });
  for (let i = 0; i < 7; i++) M.blob(ex + 3.4 + R.range(-.5, .5), 2.3 + R.range(-.3, .7), SHOP.z + .9 + R.range(-.5, .5), R.range(.28, .5), { c: R.pick([0x0e2a20, 0x123526]), r: R, sy: 1 });
  bag(M, ex + 1.2, 0, SHOP.z - 3.4, .42, 0x101014, R); bag(M, ex + 1.75, 0, SHOP.z - 3.2, .36, 0x16181e, R); bag(M, ex + 1.5, 0, SHOP.z - 2.8, .34, 0x0d0d10, R);
  /* a sandwich board facing the street */
  M.at(ex + 3, 0, SHOP.z + 3.8, Math.PI / 2, () => { setPlain(M, 0x15151a); M.box(0, 0, 0, .8, 1.15, .1, {}); M.plate(0, .62, .06, .7, .95, 0, CELL.posters.length ? CELL[CELL.posters[3]] : CELL.open, { kind: K.PAPER, em: 0 }); });
}

/* the near tower that crops the opening frame */
function nearTower(M) {
  const R = rng(9090), narrow = innerWidth / innerHeight < .8, x = narrow ? 54 : 150, z = narrow ? 332 : 372, ry = narrow ? .5 : 0, cs = Math.cos(ry), sn = Math.sin(ry);
  const W_ = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
  setPlain(M, 0x1e1f26); M.rbox(x, -2, z, 62, 8, 62, ry, { topc: 0x22232a }); for (const dx of [-28, 28]) for (const dz of [-28, 28]) { const q = W_(dx, dz); glow(q[0], 8, q[1], PAL.yellow, 7); }
  const blocks = [[44, 44, 6, 88], [38, 38, 88, 176], [30, 30, 176, 270], [22, 22, 270, 380]];
  const seed = 113;
  M.at(x, 0, z, ry, () => {
    for (const [w, d, y0, y1] of blocks) { M.set({ kind: K.FACADE, em: 128, seed, a: 4, layer: 0 }); M.extrude(rectPoly(0, 0, w, d), y0, y1, { c: 0x9a939a, grad: .7, topc: 0x34323c }); setPlain(M, 0x4a4854); M.extrude(rectPoly(0, 0, w + 1.4, d + 1.4), y1 - 1.2, y1, { topc: 0x2c2a34, grad: .9 }); roofClutter(M, rectPoly(0, 0, w, d), y1, R, 6); }
    /* both faces the camera can see */
    for (const [w, d, y0, y1] of blocks.slice(0, 3)) { faceDress(M, 0, d / 2, w, y0 + 6, Math.min(y1, 240), 0, R); faceDress(M, -w / 2, 0, d, y0 + 6, Math.min(y1, 240), -Math.PI / 2, R); }
    /* an inset vertical sign: a dark slot with lit words */
    M.at(-22.3, 74, 6, -Math.PI / 2, () => { setPlain(M, 0x08080c); M.box(0, -44, .1, 8, 88, .5, {}); M.plate(0, 0, .4, 6.6, 84, 0, bladeCell(4), { seed: 60, em: 200 }); });
    M.at(2, 62, 22.3, 0, () => { setPlain(M, 0x08080c); M.box(0, -22, .1, 7, 44, .5, {}); M.plate(0, 0, .4, 5.8, 42, 0, bladeCell(19), { seed: 90, em: 200 }); });
    neonStrip(M, 5.8, 40, 22.6, .12, 44, .12, PAL.cyan, 0);
  });
  if (!narrow) { const q = W_(-22, -8); adRig(M, q[0], 118, q[1], -Math.PI / 2 + ry, 16, 24, R, { spill: 80 }); }
  pool(x, z, 60, PAL.yellow, .25);
  pontoon(M, x, z, ry, R);
}

/* the corp tower's mark and a crown you can read across the island */
function towerMark(M) {
  const cx = 0, cz = -235, R = rng(4004);
  /* south and east faces carry the mark high up */
  setPlain(M, 0x07070b); M.box(cx, 348, cz + 21.4, 19, 92, .6, { crease: false }); M.plate(cx, 394, cz + 21.9, 17.5, 88, 0, CELL.logoV, { seed: 8, em: 255 });
  setPlain(M, 0x07070b); M.box(cx + 21.4, 376, cz, .6, 10, 32, { crease: false }); M.plate(cx + 21.9, 381, cz, 30, 8.2, Math.PI / 2, CELL.logoH, { seed: 8, em: 255 });
  glow(cx, 396, cz + 30, PAL.red, 90);
  /* crown: every step is ringed in light */
  for (const [w, y] of [[26, 540], [20, 556], [14, 574], [8.5, 596]]) { const h = .9, d = w + .5; for (const [sx, sz, ww, dd] of [[0, 1, d, .3], [0, -1, d, .3], [1, 0, .3, d], [-1, 0, .3, d]]) neonStrip(M, cx + sx * d / 2, y - h, cz + sz * d / 2, ww, h, dd, y === 596 ? PAL.red : 0xdff2ff, 0); }
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { neonStrip(M, cx + sx * 10.9, 446, cz + sz * 10.9, .4, 94, .4, PAL.red, 0); glow(cx + sx * 10.9, 540, cz + sz * 10.9, PAL.red, 26); }
  glow(cx, 560, cz, 0xffd8d0, 110); glow(cx, 590, cz, PAL.red, 60);
}


/* ---------- the menswear shop: wood, brass, leather, neon ---------- */
let PIECES = 0;
function buildRoom() {
  const M = new MB(90000), FXM = new MB(800), R = rng(1912);
  const glows = []; const G = (x, y, z, c, s, a = 0) => { const k = typeof c === 'number' ? hex(c) : c; glows.push({ x: SHOP.x + x, y, z: SHOP.z + z, r: k[0], g: k[1], b: k[2], s, a }); };
  const W = SHOP.w / 2, D = SHOP.d / 2, H = SHOP.h;
  const WAL = 0x5a3320, WALD = 0x3a2016, GRN = 0x1e4a40, OX = 0x5a1e2c, CREAM = 0xd8c9a8;
  const wood = (c = WAL) => setPlain(M, c, L.WOOD), plain = (c) => setPlain(M, c), brass = () => M.set({ kind: K.BRASS, em: 0, layer: 0, c: PAL.brass });
  const neon = (x, y, z, w, h, d, c, seed = 0) => neonStrip(M, x, y, z, w, h, d, c, seed);
  const paper = (x, y, z, w, h, ry, cell, rx = 0, o = {}) => { M.at(x, y, z, ry, () => { M.plate(0, 0, 0, w, h, 0, CELL[cell] || cell, { kind: K.PAPER, em: 0, c: [1, 1, 1], ...o }); }, rx); };
  const piece = () => PIECES++;

  M.at(SHOP.x, 0, SHOP.z, 0, () => {
    /* ---- floor: parquet, inlay border, rug ---- */
    setPlain(M, 0x7a4c2a, L.PARQUET); M.id = 11;
    const fl = (x0, x1, z0, z1, y = .05, us = .46) => M.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [x0 * us, z1 * us, x1 * us, z0 * us]);
    fl(-W, W, -D, D);
    setPlain(M, WALD); M.id = 12; for (const [a, b, c, d] of [[-W, W, -D, -D + .16], [-W, W, D - .16, D], [W - .2, W, -D, D]]) fl(a, b, c, d, .052);
    M.set({ kind: K.PAPER, em: 0, c: [1, 1, 1], id: 13, layer: 0 }); { const c = CELL.rug; M.quad([-1.8, .056, 2.3], [4.2, .056, 2.3], [4.2, .056, .95], [-1.8, .056, .95], [c[0], c[1], c[2], c[3]]); }
    /* contact shadows: flat dark shapes on the wood under big things */
    setPlain(M, 0x2c1a18, L.PARQUET); M.id = 11;
    fl(-2.4, -2.05, -3.75, 1.75, .053); fl(-3.32, -2.4, 1.5, 1.82, .053);
    fl(-1.55, .55, -.3, 1.0, .0535); fl(.72, 4.85, -D + .16, -D + .86, .053); fl(-1.3, 2.2, D - .86, D - .16, .053); fl(1.05, 3.65, -2.3, -1.45, .053);
    fl(-2.2, .5, -D + .16, -D + .78, .053); fl(2.95, 4.2, D - 1.05, D - .16, .053); fl(.55, 1.8, D - 1.15, D - .6, .053); fl(-.3, .6, -3.0, -2.3, .053);
    fl(-2.2, -1, -3.8, -3.1, .0535); fl(4.3, 5, -3.2, -1.1, .053);
    /* what a working floor collects: scuffs, grey dust in the corners, a taped cable run, dropped offcuts */
    { setPlain(M, 0x3a2418, L.PARQUET); M.id = 11; for (let i = 0; i < 26; i++) { const x = R.range(-2.2, 5), z = R.range(-3.9, 4.2), w = R.range(.12, .6), d = R.range(.012, .05); if (z > .95 && z < 2.3 && x > -1.8) continue; fl(x, x + w, z, z + d, .0545); piece(); }
      M.set({ kind: K.PLAIN, c: hex(0x6a5046), em: 0, layer: 0, id: 11 }); for (const [cx, cz, s] of [[-2.2, 3.9, .6], [5, -4.1, .7], [-2.2, -3.2, .4], [4.9, 4.2, .5]]) for (let i = 0; i < 8; i++) { const a = R() * TAU, rr = R() * s, px = cx + Math.cos(a) * rr, pz = cz + Math.sin(a) * rr, q = R.range(.05, .16); M.quad([px - q, .0548, pz + q * .6], [px + q, .0548, pz + q * .6], [px + q, .0548, pz - q * .6], [px - q, .0548, pz - q * .6]); }
      /* cable from the counter's foot out to the fuse side, gaffer every half metre */
      const cab = [[-2.32, .06, .9], [-1.9, .062, .76], [-1.2, .062, .8], [-.8, .062, -.42], [.4, .062, -.72], [.9, .062, -1.22], [1, .062, -3.7]]; M.tube(cab, .011, 26, 4, { c: 0x08080c }); M.tube(cab.map(p => [p[0] + .022, p[1], p[2] + .012]), .008, 26, 3, { c: 0x4a1414 });
      for (const [px, pz, a] of [[-1.5, .78, .1], [-.98, .2, 1.3], [-.2, -.56, .25], [.72, -1, .9], [.98, -2, 1.5], [.99, -3.1, 1.5]]) { M.at(px, .0605, pz, a, () => { M.set({ kind: K.PLAIN, c: hex(0xc8a828), em: 0, layer: 0, id: 11 }); M.quad([-.05, 0, .1], [.05, 0, .1], [.05, 0, -.1], [-.05, 0, -.1]); setPlain(M, 0x8a7418); M.quad([-.05, .0004, .1], [-.03, .0004, .1], [-.03, .0004, -.1], [-.05, .0004, -.1]); }); piece(); }
      /* offcuts and threads where the tailor works */
      const scraps = [0x26324e, 0x6a5436, 0x7a2030, 0xb8a888, 0x3c4048, 0x46506a]; for (let i = 0; i < 18; i++) { const x = R.range(-1.9, 1.1), z = R.range(-3.2, -.5), s = R.range(.03, .09), a = R() * TAU, c = R.pick(scraps); M.at(x, .0595, z, a, () => { setPlain(M, c, i % 2 ? L.WEAVE : L.HERRING); M.id = M.nid(); M.tri([-s, 0, -s * .5], [s * .7, 0, s], [s, 0, -s * .7], [0, 0], [1, 1], [1, 0]); M.tri([-s, 0, -s * .5], [-s * .4, 0, s * .8], [s * .7, 0, s], [0, 0], [0, 1], [1, 1]); }); piece(); }
      for (let i = 0; i < 10; i++) { const x = R.range(-1.2, .8), z = R.range(-3, -.6), c = R.pick([0xf0e8d8, 0xc03a3a, 0x3a5ac0]); M.tube([[x, .058, z], [x + R.range(-.06, .06), .058, z + .05], [x + R.range(-.1, .1), .058, z + .11]], .0016, 4, 3, { c }); piece(); }
    }
    /* ---- ceiling plate ---- */
    setPlain(M, 0x2a1a22, L.COFFER); M.id = 14;
    M.quad([-W, H, -D], [W, H, -D], [W, H, D], [-W, H, D], [0, 0, 11 * .5, 9 * .5]);
    /* coffers: deep beams, a second stepped frame, one brass boss per bay */
    const nx = 6, nz = 5; const bw = .2;
    wood(WALD);
    for (let i = 0; i <= nx; i++) { const x = -W + i * (2 * W) / nx; M.box(x, H - .34, 0, bw, .34, 2 * D, { uvS: .6, bot: true }); M.box(x, H - .4, 0, bw * .55, .06, 2 * D, { c: 0x6a3c24, uvS: .6 }); }
    for (let j = 0; j <= nz; j++) { const z = -D + j * (2 * D) / nz; M.box(0, H - .34, z, 2 * W, .34, bw, { uvS: .6 }); M.box(0, H - .4, z, 2 * W, .06, bw * .55, { c: 0x6a3c24, uvS: .6 }); }
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = -W + (i + .5) * (2 * W) / nx, z = -D + (j + .5) * (2 * D) / nz, ww = (2 * W) / nx - bw, dd = (2 * D) / nz - bw;
      setPlain(M, i % 2 === j % 2 ? 0x3a2030 : 0x34202c, L.COFFER);
      M.box(x, H - .12, z, ww - .12, .03, dd - .12, { uvS: .5, c: 0x3e2432 });
      plain(0x4e2c20); M.box(x, H - .16, z, ww * .62, .04, .03, {}); M.box(x, H - .16, z, .03, .04, dd * .62, {});
      brass(); M.lathe(x, H - .2, z, [[.0, -.03], [.05, 0], [.04, .05]], 6, { c: PAL.brass });
    }
    /* pendant lights over the floor */
    for (const [x, z] of [[-.2, -.4], [2.2, -.4], [-.2, 2.2], [2.2, 2.2], [4.1, .9]]) {
      brass(); M.cyl(x, H - .95, z, .012, .012, .6, 4, { c: PAL.brass, top: false });
      M.set({ kind: K.BRASS, c: PAL.brass }); M.lathe(x, H - 1.12, z, [[.21, 0], [.205, .012], [.17, .06], [.11, .12], [.06, .17], [.03, .2]], 28, { c: PAL.brass });
      M.set({ kind: K.PLAIN, c: hex(0xfff0c8), em: 255, layer: 0 }); M.lathe(x, H - 1.14, z, [[.0, -.02], [.1, 0], [.17, .05]], 20, { c: 0xfff0c8 }); M.set({ em: 0 });
      G(x, H - 1.15, z, 0xffd090, 1.4);
      /* soft cone below */
      FXM.set({ kind: 1, a: 30, c: [1, .72, .4] }); for (let i = 0; i < 10; i++) { const a0 = i / 10 * TAU, a1 = (i + 1) / 10 * TAU; const P = (A, r, y) => [SHOP.x + x + Math.cos(A) * r, y, SHOP.z + z + Math.sin(A) * r]; FXM.quad(P(a0, .17, H - 1.14), P(a1, .17, H - 1.14), P(a1, 1.2, .2), P(a0, 1.2, .2), [0, 0, 1, 1]); }
      piece();
    }
    /* ---- walls: wainscot, fabric, picture rail, cornice ---- */
    const wallRun = (len, build) => build(len);
    const walls = [{ x: 0, z: -D, ry: 0, len: 2 * W }, { x: 0, z: D, ry: Math.PI, len: 2 * W }, { x: -W, z: 0, ry: Math.PI / 2, len: 2 * D }];
    for (const w of walls) M.at(w.x, 0, w.z, w.ry, () => {
      const L0 = w.len / 2;
      /* fabric upper: oxblood on the long walls, with herringbone */
      setPlain(M, w.ry === Math.PI ? 0x2e564c : OX, L.TILE); M.id = M.nid();
      M.quad([-L0, 1.15, 0], [L0, 1.15, 0], [L0, H, 0], [-L0, H, 0], [0, 1.15 * .6, w.len * .6, H * .6]);
      wood(); M.id = M.nid(); M.quad([-L0, 0, 0], [L0, 0, 0], [L0, 1.15, 0], [-L0, 1.15, 0], [0, 0, w.len * .5, 1.15 * .5]);
      wood(WALD); M.box(0, 0, .03, w.len, .2, .06, { uvS: .6 }); M.box(0, 1.1, .035, w.len, .09, .07, { uvS: .6, c: 0x6e4228 }); M.box(0, .96, .02, w.len, .06, .04, { uvS: .6 });
      /* raised panels with a stile between */
      const n = Math.floor(w.len / .62);
      for (let i = 0; i < n; i++) { const x = -L0 + (i + .5) * w.len / n; wood(0x6a3c24); M.box(x, .3, .018, w.len / n - .14, .56, .03, { uvS: .6 }); wood(0x7b4a2a); M.box(x, .36, .034, w.len / n - .26, .44, .02, { uvS: .6 }); wood(WALD); M.box(x - w.len / n / 2, .2, .02, .05, .76, .04, { uvS: .6 }); }
      /* picture rail and a cornice in steps */
      brass(); M.box(0, 2.88, .018, w.len, .03, .03, { c: PAL.brass });
      wood(WALD); M.box(0, H - .46, .05, w.len, .1, .1, { uvS: .6 }); wood(0x6a3c24); M.box(0, H - .36, .09, w.len, .08, .18, { uvS: .6 }); wood(WALD); M.box(0, H - .28, .13, w.len, .28, .26, { uvS: .6 });
      /* uplight behind the cornice */
      neon(0, H - .475, .14, w.len - .4, .03, .02, w.ry === 0 ? PAL.cyan : w.ry === Math.PI ? PAL.magenta : 0xffb060, 0);
    });
    /* ---- storefront inner side: riser, mullions, transom ---- */
    const ex = W - .02;
    wood(); M.box(ex - .1, 0, -2.0, .2, .46, 5, { uvS: .6 }); M.box(ex - .1, 0, 3.55, .2, .46, 1.9, { uvS: .6 });
    wood(WALD); M.box(ex - .08, 3.42, 0, .16, H - 3.42, 2 * D, { uvS: .6 });
    brass();
    for (const z of [-4.2, -3.1, -2, -.9, .46, 2.74, 3.6, 4.3]) M.box(ex - .03, .44, z, .06, 3, .07, { c: PAL.brass });
    M.box(ex - .03, 2.72, -2.2, .05, .04, 4.6, { c: PAL.brass }); M.box(ex - .03, 2.72, 3.5, .05, .04, 1.8, { c: PAL.brass }); M.box(ex - .03, 3.38, 0, .06, .05, 2 * D, { c: PAL.brass });
    /* lettering on the window and the neon hung behind the glass */
    paper(ex - .06, 3.02, -2.3, 3.4, .78, -Math.PI / 2, 'goldLeafRev', 0, { kind: K.SIGN, em: 165, c: [1, .9, .72], seed: 0 });
    plain(0x121116); M.box(2.5, 2.84, -D + .05, 2.4, .5, .03, {}); M.plate(2.5, 3.09, -D + .075, 2.2, .57, 0, CELL.tailorNeon, { seed: 200, em: 255 });
    G(2.5, 3.08, -D + .34, [.62, .1, .1], 2.6); G(2.5, 2.92, -D + .3, [.03, .34, .4], 1.5); piece();
    /* ---- counter ---- */
    const cx0 = -3.32, cx1 = -2.4, cz0 = -3.7, cz1 = 1.5, cH = .96, cW = cx1 - cx0, cL = cz1 - cz0, ccx = (cx0 + cx1) / 2, ccz = (cz0 + cz1) / 2;
    wood(); M.box(ccx, .1, ccz, cW, cH - .14, cL, { uvS: .7 });
    wood(WALD); M.box(ccx + .02, 0, ccz, cW - .06, .1, cL, { uvS: .7 });
    /* front panels */
    const npan = 8; for (let i = 0; i < npan; i++) { const z = cz0 + (i + .5) * cL / npan; wood(0x6e4228); M.box(cx1 + .012, .22, z, .03, .6, cL / npan - .1, { uvS: .7 }); wood(0x8a5630); M.box(cx1 + .03, .28, z, .02, .48, cL / npan - .22, { uvS: .7 }); }
    M.set({ kind: K.BRASS, c: PAL.brass }); M.box(cx1 + .08, .08, ccz, .02, .02, cL - .1, {}); for (let i = 0; i < 6; i++) { M.box(cx1 + .05, .07, cz0 + .1 + i * (cL - .2) / 5, .06, .04, .02, {}); }
    /* south end panel */
    wood(0x6e4228); M.box(ccx, .22, cz1 + .012, cW - .12, .6, .03, { uvS: .7 });
    /* the top: marble with a brass lip */
    wood(WALD); M.box(ccx, cH - .04, ccz, cW + .08, .05, cL + .08, { uvS: .8 });
    /* inset cutting pad in fine green leather, a stitched edge, an inlaid brass rule */
    setPlain(M, 0x1b4034, L.LEATHER); M.box(ccx, cH + .008, ccz, cW - .05, .0035, cL - .06, { uvS: 3.4, topc: 0x1f4a3c, id: 60 });
    { const y = cH + .0122, x0 = cx0 + .05, x1 = cx1 - .05, z0 = cz0 + .06, z1 = cz1 - .06; M.set({ kind: K.PLAIN, layer: 0, c: hex(0xc8b890), em: 0 }); for (let z = z0; z < z1 - .03; z += .05) { for (const xx of [x0, x1]) M.quad([xx - .002, y, z + .028], [xx + .002, y, z + .028], [xx + .002, y, z], [xx - .002, y, z]); } for (let x = x0; x < x1 - .03; x += .05) { for (const zz of [z0, z1]) M.quad([x, y, zz + .002], [x + .028, y, zz + .002], [x + .028, y, zz - .002], [x, y, zz - .002]); }
      /* the rule, with ticks */
      M.set({ kind: K.BRASS, c: PAL.brass }); M.box(cx0 + .1, cH + .0115, ccz, .05, .001, cL - .3, {}); M.set({ kind: K.PLAIN, c: hex(0x18120c) }); for (let i = 0; i < 90; i++) { const z = cz0 + .2 + i * .05, l = i % 5 === 0 ? .034 : .018; M.quad([cx0 + .076, y + .0006, z + .002], [cx0 + .076 + l, y + .0006, z + .002], [cx0 + .076 + l, y + .0006, z - .002], [cx0 + .076, y + .0006, z - .002]); } piece(); }
    M.set({ kind: K.BRASS, c: PAL.brass }); M.box(ccx, cH - .055, ccz, cW + .1, .02, cL + .1, {});
    /* inside the counter: drawers and open shelves toward you */
    wood(WALD); M.box(cx0 - .012, .14, ccz, .02, .74, cL, { uvS: .7 });
    neon(cx0 - .05, cH - .1, ccz, .012, .014, cL - .1, 0xffb060, 0);
    for (let i = 0; i < 12; i++) { const z = cz0 + (i + .5) * cL / 12; setPlain(M, 0x8a5430, L.WOOD, 70); M.box(cx0 - .03, .55, z, .03, .26, cL / 12 - .05, { uvS: .7 }); M.set({ em: 0 }); setPlain(M, 0x6a3f24, L.WOOD, 44); M.box(cx0 - .03, .2, z, .03, .3, cL / 12 - .05, { uvS: .7 }); M.set({ em: 0 }); setPlain(M, 0x1a1208); M.box(cx0 - .032, .535, z, .03, .012, cL / 12, {}); M.set({ kind: K.BRASS, c: PAL.brass, em: 26 }); M.box(cx0 - .05, .67, z, .02, .02, .1, {}); M.box(cx0 - .05, .36, z, .02, .02, .1, {}); M.set({ em: 0 }); piece(); }
    /* ---- things on the counter (register, ledger and notepad stay clear) ---- */
    const top = cH + .012; const tx = -2.85; const rz = -.4;
    /* a bevelled box helper: chamfered walls, a rolled top edge */
    const bev = (x, y, z, w, h, d, b, c, o = {}) => { plain(c); const A = chamferPoly(x, z, w, d, b), B = chamferPoly(x, z, w - 2 * b, d - 2 * b, b * .7); M.extrude(A, y, y + h - b, { c, top: false, grad: o.grad === undefined ? .78 : o.grad }); M.loft([A.map(p => [p[0], y + h - b, p[1]]), B.map(p => [p[0], y + h, p[1]])], { c: o.edge !== undefined ? o.edge : c, grad: 1 }); const k = M.c; M.c = hex(c); const p0 = B[0]; for (let i = 1; i < B.length - 1; i++) { const q0 = B[i], q1 = B[(i + 1)]; M.tri([p0[0], y + h, p0[1]], [q0[0], y + h, q0[1]], [q1[0], y + h, q1[1]]); } M.c = k; };
    /* paper that curls: a ribbon along a path */
    const ribbon = (pts, w, seg, o = {}) => { const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))); const Pt = curve.getPoints(seg), u = o.cell || [0, 0, 1, 1]; M.set({ kind: o.cell ? K.PAPER : K.PLAIN, c: o.c === undefined ? [1, 1, 1] : hex(o.c), em: 0, layer: o.layer || 0, id: M.nid() }); for (let i = 0; i < seg; i++) { const a = Pt[i], b = Pt[i + 1], s = o.side || [0, 0, 1], v0 = lerp(u[1], u[3], i / seg), v1 = lerp(u[1], u[3], (i + 1) / seg), A0 = [a.x - s[0] * w / 2, a.y - s[1] * w / 2, a.z - s[2] * w / 2], A1 = [a.x + s[0] * w / 2, a.y + s[1] * w / 2, a.z + s[2] * w / 2], B1 = [b.x + s[0] * w / 2, b.y + s[1] * w / 2, b.z + s[2] * w / 2], B0 = [b.x - s[0] * w / 2, b.y - s[1] * w / 2, b.z - s[2] * w / 2]; M.quad(A0, A1, B1, B0, [u[0], v0, u[2], v1]); M.quad(B0, B1, A1, A0, [u[0], v1, u[2], v0]); } };
    /* register: a heavy old till body, worn on its edges, retrofitted with a curved screen */
    { const z = rz - .42, wear = 0x4a4852;
      bev(tx - .02, top, z, .5, .13, .44, .016, 0x1a1a20, { edge: wear });
      /* cash drawer facing you: brass pull, a lock, a scuffed strip */
      plain(0x25252c); M.box(tx - .275, top + .018, z, .012, .085, .38, {}); M.set({ kind: K.BRASS, c: PAL.brass }); M.box(tx - .287, top + .05, z, .014, .018, .15, {}); M.cyl(tx - .283, top + .068, z + .15, .008, .008, .004, 6, {});
      plain(wear); M.box(tx - .276, top + .094, z, .006, .006, .4, {}); plain(0x0d0d10); M.box(tx - .282, top + .014, z, .004, .004, .39, {});
      /* stickers on the front and side */
      for (const [zz, yy, k, sz] of [[-.13, .07, 2, .05], [.12, .036, 3, .036], [.05, .074, 5, .03]]) { M.at(tx - .2885, top + yy, z + zz, -Math.PI / 2, () => M.plate(0, 0, 0, sz, sz, 0, CELL['stk' + k], { kind: K.PAPER, em: 0, c: [.95, .95, .95] }), 0, R.range(-.2, .2)); piece(); }
      /* key deck, sloped */
      bev(tx - .1, top + .13, z, .3, .03, .4, .01, 0x22222a, { edge: 0x3a3a44 });
      for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) { const hot = i === 3 && j === 4; const c = hot ? 0xe8302a : j === 4 ? 0xd8a838 : i === 0 ? 0x4a4a58 : 0x34343e; M.set({ kind: K.PLAIN, c: hex(c), em: 0 }); bev(tx - .2 + j * .046, top + .16, z - .12 + i * .08, .038, .014, .062, .004, c, { edge: mixC(c, 0xffffff, .28), grad: .6 }); piece(); }
      /* neck to the screen, a cable loop behind it */
      bev(tx + .1, top + .13, z, .09, .1, .12, .014, 0x2a2a32); M.tube([[tx + .16, top + .18, z + .05], [tx + .24, top + .1, z + .12], [tx + .2, top + .02, z + .2]], .006, 8, 4, { c: 0x07070b });
      /* the screen: curved face, rounded bezel, a shell behind */
      M.at(tx + .07, top + .365, z, 0, () => {
        const ww = .4, hh = .27, ring = (dx, k, bulge) => roundPoly(0, 0, ww * k, hh * k, .028 * k, 3).map(p => [dx, p[1], p[0]]);
        plain(0x101014); M.loft([ring(.032, .84, 0), ring(.014, 1, 0), ring(-.012, 1.02, 0)], { c: 0x17171c, grad: .7, flip: true });
        plain(0x0a0a0d); M.loft([ring(-.012, 1.02, 0), ring(-.02, .985, 0), ring(-.021, .925, 0)], { c: 0x24242a, grad: 1, flip: true });
        /* face */
        const c = CELL.till, seg = 8, W2 = ww * .9 / 2, H2 = hh * .88 / 2; M.set({ kind: K.SCREEN, em: 255, c: [1, 1, 1], id: 0, seed: 1, layer: 0 });
        for (let i = 0; i < seg; i++) { const t0 = i / seg, t1 = (i + 1) / seg, bx = t => -.021 - .007 * (1 - Math.pow(2 * t - 1, 2)), z0 = lerp(-W2, W2, t0), z1 = lerp(-W2, W2, t1); M.quad([bx(t0), -H2, z0], [bx(t1), -H2, z1], [bx(t1), H2, z1], [bx(t0), H2, z0], [lerp(c[0], c[2], t0), c[1], lerp(c[0], c[2], t1), c[3]]); }
        /* maker's plate and a small status light under it */
        M.set({ kind: K.BRASS, c: PAL.brass }); M.box(-.022, -.137, 0, .004, .008, .08, {}); M.set({ kind: K.NEON, c: hex(PAL.green), seed: 0 }); M.box(-.022, -.137, .12, .004, .006, .012, {});
      }, 0, -.2);
      /* screen light on the counter */
      FXM.set({ kind: 3, a: 44, c: [.25, .85, 1] }); { const X = SHOP.x + tx - .05, Z = SHOP.z + z, Y = top + .004; FXM.quad([X, Y, Z - .24], [X, Y, Z + .24], [X - .62, Y, Z + .36], [X - .62, Y, Z - .36], [0, 0, 1, 1]); }
      G(tx - .05, top + .36, z, [.1, .42, .5], .7);
      /* receipt printer with a real curl of paper */
      bev(tx - .05, top, z - .32, .16, .1, .17, .014, 0x1c1c22, { edge: wear }); ribbon([[tx - .03, top + .1, z - .32], [tx - .03, top + .17, z - .32], [tx - .11, top + .2, z - .32], [tx - .18, top + .13, z - .32], [tx - .2, top + .03, z - .32], [tx - .26, top + .004, z - .32]], .07, 12, { cell: CELL.ticket }); piece();
      /* card reader with a small light */
      plain(0x1d1b26); M.rbox(tx + .16, top, z + .28, .1, .03, .16, .25, {}); M.set({ kind: K.NEON, c: hex(PAL.green), seed: 0 }); M.box(tx + .16, top + .03, z + .32, .05, .004, .012, {}); piece();
    }
    /* ledger, open, leather cover, ribbon and a pen */
    { const z = rz + .02, x = tx + .02;
      setPlain(M, 0x3a1a18, L.LEATHER); M.box(x, top, z, .34, .012, .54, { uvS: 3 });
      setPlain(M, 0xe6dcc0); M.box(x, top + .012, z - .13, .31, .022, .25, {}); M.box(x, top + .012, z + .13, .31, .022, .25, {});
      paper(x, top + .036, z - .13, .24, .3, -Math.PI / 2, 'ledgerL', -Math.PI / 2);
      paper(x, top + .036, z + .13, .24, .3, -Math.PI / 2, 'ledgerR', -Math.PI / 2);
      M.set({ kind: K.PLAIN, c: hex(0xb02a2a), em: 0 }); M.box(x + .17, top, z + .002, .12, .002, .012, {});
      for (const sz of [-1, 1]) { const zc = z + sz * .13; for (let n = 0; n < 6; n++) { const yy = top + .0135 + n * .0034; M.set({ kind: K.PLAIN, c: hex(n % 2 ? 0xb8ae90 : 0xd8ceb0), em: 0, layer: 0 }); M.quad([x - .1565, yy, zc + .125], [x - .1565, yy, zc - .125], [x - .1565, yy + .0017, zc - .125], [x - .1565, yy + .0017, zc + .125]); M.quad([x + .1565, yy, zc - .125], [x + .1565, yy, zc + .125], [x + .1565, yy + .0017, zc + .125], [x + .1565, yy + .0017, zc - .125]); const ze = zc + sz * .1255; if (sz > 0) M.quad([x - .155, yy, ze], [x + .155, yy, ze], [x + .155, yy + .0017, ze], [x - .155, yy + .0017, ze]); else M.quad([x + .155, yy, ze], [x - .155, yy, ze], [x - .155, yy + .0017, ze], [x + .155, yy + .0017, ze]); } }
      /* a dark gutter down the spine, one leaf lifting off the right page */
      M.set({ kind: K.PLAIN, c: hex(0x4a3a2a), em: 0, layer: 0 }); M.quad([x - .155, top + .0352, z + .011], [x + .155, top + .0352, z + .011], [x + .155, top + .0352, z - .011], [x - .155, top + .0352, z - .011]);
      M.set({ kind: K.PLAIN, c: hex(0xf0e6cc), em: 0, layer: 0, id: M.nid() }); { const Y = top + .036, A = [x - .15, Y, z + .25], B = [x + .15, Y, z + .25]; M.quad(A, B, [x + .15, Y + .004, z + .24], [x - .15, Y + .004, z + .24]); }
      pencilAt(M, x + .05, top + .04, z + .2, .5, .2, 0x8a6a2a, 0x121018); piece(); piece();
    }
    /* notepad, pencil */
    { const z = rz + .42, x = tx + .02;
      setPlain(M, 0xd8cf88); M.rbox(x, top, z, .2, .022, .15, .09, {});
      M.at(x, top + .024, z, .09, () => { paper(0, 0, 0, .145, .195, -Math.PI / 2, 'notepad', -Math.PI / 2); });
      pencilAt(M, x + .02, top + .03, z + .11, .6, .17, 0xe8b830, 0xe05050); piece();
    }
    /* espresso, saucer, spoon */
    { const x = tx + .22, z = rz + .76;
      setPlain(M, 0xece6d8); M.lathe(x, top, z, [[.0, 0], [.058, 0], [.065, .012], [.03, .004]], 10, { c: 0xece6d8 }); M.lathe(x, top + .008, z, [[.0, 0], [.022, 0], [.033, .025], [.036, .058], [.032, .058]], 10, { c: 0xf4eee0 });
      setPlain(M, 0x20100a); M.cyl(x, top + .06, z, .03, .03, .001, 8, {});
      M.tube([[x + .03, top + .05, z], [x + .05, top + .05, z], [x + .05, top + .025, z], [x + .03, top + .028, z]], .004, 5, 3, { c: 0xf4eee0 });
      M.set({ kind: K.BRASS, c: PAL.brass }); M.rbox(x + .03, top + .012, z - .05, .006, .004, .08, .8, {}); piece(); piece();
      /* a thread of steam */
    }
    /* brass card tray and cards */
    { const x = tx + .08, z = rz - 1.05;
      M.set({ kind: K.BRASS, c: PAL.brass }); M.lathe(x, top, z, [[.0, 0], [.1, 0], [.115, .018]], 12, { c: PAL.brass, sq: .72 });
      for (let i = 0; i < 7; i++) { M.at(x + R.range(-.012, .012), top + .004 + i * .0018, z, R.range(-.12, .12), () => paper(0, 0, 0, .09, .054, Math.PI / 2, 'card', -Math.PI / 2)); piece(); }
    }
    /* banker's lamp */
    { const x = tx - .05, z = rz - 1.42;
      M.set({ kind: K.BRASS, c: PAL.brass }); M.lathe(x, top, z, [[.0, 0], [.09, 0], [.086, .008], [.07, .02], [.03, .026], [.012, .034], [.012, .34]], 20, { c: PAL.brass });
      M.at(x + .02, top + .38, z, 0, () => { setPlain(M, 0x12503e); M.lathe(0, 0, 0, [[.14, -.03], [.135, -.015], [.11, .03], [.06, .058], [.02, .07]], 24, { c: 0x176a50, sq: .55 }); M.set({ kind: K.PLAIN, c: hex(0xffe6b0), em: 255 }); M.box(0, -.04, 0, .15, .008, .05, {}); M.set({ em: 0 }); });
      G(x + .02, top + .3, z, 0xffd090, .6); piece();
    }
    /* tailor's bits along the rest of the top */
    const spool = (x, z, c) => { plain(0x8a6a44); M.cyl(x, top, z, .022, .022, .006, 6, {}); M.cyl(x, top + .044, z, .022, .022, .006, 6, {}); M.cyl(x, top + .006, z, .017, .017, .038, 6, { c }); piece(); };
    [[.02, .9, 0xc03a3a], [.07, .92, 0x3a5ac0], [.12, .9, 0xe0d0a0], [.04, .96, 0x202030], [.09, .97, 0x7a3a8a], [.14, .96, 0x3a8a6a], [.18, .92, 0xd0a030], [.16, .99, 0xffffff]].forEach(([dx, dz, c]) => spool(tx + dx, rz + dz + .38, c));
    /* pin cushion with pins */
    cushion(M, tx - .1, top, rz + 1.12, .042, 0xa02a3a); for (let i = 0; i < 9; i++) { const a = R() * TAU; M.set({ kind: K.BRASS, c: 0xdfe4ee }); M.beam([tx - .1 + Math.cos(a) * .03, top + .04, rz + 1.12 + Math.sin(a) * .03], [tx - .1 + Math.cos(a) * .05, top + .08, rz + 1.12 + Math.sin(a) * .05], .002, {}); piece(); }
    /* scissors */
    M.at(tx + .22, top + .002, rz + 1.1, .7, () => { M.set({ kind: K.BRASS, c: 0xc8d0dc }); M.box(.0, 0, -.05, .012, .003, .13, {}); M.at(0, 0, 0, .14, () => M.box(.0, 0, -.05, .012, .003, .13, {})); plain(0x121018); M.lathe(-.02, 0, .05, [[.012, 0], [.024, .002], [.022, .006], [.012, .004]], 6, {}); M.lathe(.02, 0, .05, [[.012, 0], [.024, .002], [.022, .006], [.012, .004]], 6, {}); }); piece();
    /* tape measure, coiled and trailing */
    setPlain(M, 0xe8cc58); M.lathe(tx - .12, top, rz + 1.42, [[.02, 0], [.05, 0], [.05, .016], [.02, .016]], 10, { c: 0xe8cc58 }); M.tube([[tx - .08, top + .004, rz + 1.42], [tx, top + .004, rz + 1.5], [tx + .08, top + .004, rz + 1.42], [tx + .24, top - .002, rz + 1.5], [tx + .46, top - .16, rz + 1.54], [tx + .46, top - .46, rz + 1.5]], .006, 12, 3, { c: 0xe8cc58 }); piece();
    /* chalk, tag box, jar of buttons, spike of receipts, stapler, stamp */
    for (let i = 0; i < 4; i++) { M.set({ kind: K.PLAIN, c: hex([0xd8d2c0, 0xc0a0a0, 0x8aa2b0, 0xc0ac74][i]) }); M.rbox(tx + .26 + i * .018, top, rz + 1.32 + i * .03, .018, .008, .06, R.range(-1, 1), {}); piece(); }
    setPlain(M, 0x2a2430); M.box(tx - .14, top, rz - .1 - 1.86, .14, .06, .2, {}); for (let i = 0; i < 5; i++) { paper(tx - .14 + (i - 2) * .018, top + .08, rz - 1.96, .018, .05, Math.PI / 2, 'tag', 0); piece(); }
    M.set({ kind: K.PLAIN, c: hex(0x8fb0c0) }); M.lathe(tx + .12, top, rz - 1.82, [[0, 0], [.05, 0], [.052, .09], [.04, .11]], 8, { c: 0x6f96a8 }); for (let i = 0; i < 12; i++) { M.set({ kind: K.BRASS, c: R.pick([0xdcb060, 0xeee0c0, 0x70483a, 0x101010]) }); M.cyl(tx + .12 + R.range(-.03, .03), top + R.range(.005, .08), rz - 1.82 + R.range(-.03, .03), .012, .012, .004, 6, {}); piece(); }
    M.set({ kind: K.BRASS, c: PAL.brass }); M.cyl(tx - .22, top, rz - .08 - 1.2 - .7, .04, .04, .01, 8, {}); M.cyl(tx - .22, top + .01, rz - 1.98, .002, .001, .15, 3, { c: 0xdcdce0 }); for (let i = 0; i < 6; i++) { paper(tx - .22, top + .03 + i * .008, rz - 1.98, .055, .1, R.range(-.14, .14), 'ticket', -Math.PI / 2); piece(); }
    plain(0x1c1a24); M.rbox(tx + .28, top, rz - 1.42, .055, .05, .15, .3, {}); M.set({ kind: K.BRASS, c: 0x9aa0ac }); M.rbox(tx + .28, top + .05, rz - 1.42, .05, .012, .13, .3, {}); piece();
    plain(0x5a2a1a); M.lathe(tx + .32, top, rz - 1.12, [[0, 0], [.024, 0], [.024, .008], [.01, .012], [.012, .05], [.018, .07], [0, .075]], 7, {}); piece();
    /* ---- close to the lens: what a tailor actually has within reach ---- */
    { const fx = -3.12;
      /* coffee rings on the leather */
      const cring = (x, z, r, a) => { M.set({ kind: K.PLAIN, c: hex(0x0f2a22), em: 0, layer: 0, id: 11 }); const seg = 18; for (let i = 0; i < seg; i++) { if (i / seg > a) break; const t0 = i / seg * TAU, t1 = (i + 1) / seg * TAU, r1 = r * .9; const y = top + .0002; M.quad([x + Math.cos(t0) * r, y, z + Math.sin(t0) * r], [x + Math.cos(t0) * r1, y, z + Math.sin(t0) * r1], [x + Math.cos(t1) * r1, y, z + Math.sin(t1) * r1], [x + Math.cos(t1) * r, y, z + Math.sin(t1) * r]); } piece(); };
      cring(fx + .02, rz + .78, .05, 1); cring(fx + .1, rz + .84, .05, .7); cring(tx - .14, rz + .28, .05, .86);
      /* pincushion, big and close, pins with coloured heads */
      cushion(M, fx - .02, top, rz + .28, .06, 0xb0202c); for (let i = 0; i < 16; i++) { const a = R() * TAU, b = R.range(.2, .9), dx = Math.cos(a) * b, dz = Math.sin(a) * b, base = [fx - .02 + dx * .045, top + .06 + (1 - b) * .04, rz + .28 + dz * .045], tip = [base[0] + dx * .032, base[1] + .05, base[2] + dz * .032]; M.set({ kind: K.BRASS, c: 0xdfe4ee }); M.beam(base, tip, .0016, {}); M.set({ kind: K.PLAIN, c: hex(R.pick([0xf6ee1c, 0x16e4f4, 0xff2a2a, 0xf4f0e4, 0x222228])) }); M.cyl(tip[0], tip[1], tip[2], .0045, .0045, .006, 5, {}); piece(); }
      /* painted contact shadows on the pad */
      const ao = (x, z, rx, rz, a = 0) => { M.set({ kind: K.PLAIN, c: hex(0x143a30), em: 0, layer: 0, id: 174 }); M.at(x, top + .0004, z, a, () => { const seg = 14; for (let i = 0; i < seg; i++) { const t0 = i / seg * TAU, t1 = (i + 1) / seg * TAU; M.tri([0, 0, 0], [Math.cos(t1) * rx, 0, Math.sin(t1) * rz], [Math.cos(t0) * rx, 0, Math.sin(t0) * rz]); } }); M.set({ id: 11 }); };
      ao(fx - .02, rz + .28, .075, .07); ao(fx + .03, rz - .92, .058, .058); ao(fx - .02, rz - .52, .14, .1, -.28);
      /* tailor's chalk: thick wedges with worn round corners, muted colours, one snapped */
      const chalk = (x, z, a, c, k = 1, snap = 0) => { ao(x + .004, z + .003, .042 * k, .036 * k, a); M.at(x, top, z, a, () => { const w = .066 * k, d = (snap ? .03 : .052) * k, base = roundPoly(0, 0, w, d, .012 * k, 3), ring = (sc, yf) => base.map(p => [p[0] * sc, yf(p), p[1] * sc]); const hone = p => .0028 + .0074 * clamp(p[1] / d + .5); setPlain(M, c); M.loft([base.map(p => [p[0], 0, p[1]]), ring(1, p => hone(p) * .8), ring(.93, hone)], { c, grad: .66 }); const topR = ring(.93, hone), n = topR.length; let mx = 0, my = 0, mz = 0; for (const q of topR) { mx += q[0] / n; my += q[1] / n; mz += q[2] / n; } for (let i = 0; i < n; i++) M.tri([mx, my, mz], topR[(i + 1) % n], topR[i]); /* the worn edge is paler */ M.set({ kind: K.PLAIN, c: hex(mixC(c, 0xffffff, .34)), em: 0, layer: 0 }); M.quad([-w * .36, .0036, -d * .46], [w * .36, .0036, -d * .46], [w * .3, .0042, -d * .3], [-w * .3, .0042, -d * .3]); }); M.set({ kind: K.PLAIN, c: hex(mixC(0x1f4a3c, c, .35)), em: 0, layer: 0, id: 174 }); for (let i = 0; i < 5; i++) { const px = x + R.range(-.06, .06), pz = z + R.range(-.06, .06), q = R.range(.003, .009); M.quad([px - q, top + .0006, pz + q], [px + q, top + .0006, pz + q], [px + q, top + .0006, pz - q], [px - q, top + .0006, pz - q]); } M.set({ id: 11 }); piece(); };
      chalk(fx + .05, rz + .0, .3, 0xd8d2c0); chalk(fx - .05, rz - .13, 1.4, 0x7f9fae, .94); chalk(fx + .13, rz - .17, 2.2, 0xbda564, .9); chalk(fx + .185, rz - .1, .9, 0xbda564, .72, 1);
      /* dust and a chalked arc, one continuous soft line */
      M.set({ kind: K.PLAIN, c: hex(0x4a6658), em: 0, layer: 0, id: 174 }); { let ax = fx + .14, az = rz - .38; for (let i = 0; i < 26; i++) { const t = (i + 1) / 26, nx = fx + .14 - t * .3, nz = rz - .38 + t * .24 + Math.sin(t * 3.1) * .05, w0 = .0014 + .0014 * Math.sin(t * 3.1); M.quad([ax, top + .0006, az + w0], [nx, top + .0006, nz + w0], [nx, top + .0006, nz - w0], [ax, top + .0006, az - w0]); ax = nx; az = nz; } }
      /* receipt spike, loaded */
      const sx = fx + .03, sz = rz - .92; M.set({ kind: K.BRASS, c: PAL.brass }); M.cyl(sx, top, sz, .05, .046, .012, 10, {}); M.cyl(sx, top + .012, sz, .0026, .0008, .19, 4, { c: 0xdcdce0 }); for (let i = 0; i < 10; i++) { const yy = top + .016 + i * .0055; M.at(sx + R.range(-.002, .002), yy, sz + R.range(-.002, .002), R.range(-.05, .05) + (i % 4 === 0 ? .14 : 0), () => paper(0, 0, 0, .065, .12, 0, 'ticket', -Math.PI / 2 + R.range(-.025, .025), { c: i % 3 ? [1, 1, 1] : [.9, .86, .7] })); piece(); }
      /* tablet on the pad: the shop's one bright modern thing */
      M.at(fx - .02, top + .006, rz - .52, -.28, () => { bev(0, 0, 0, .25, .012, .17, .004, 0x121216, { edge: 0x34343c }); M.plate(0, .0128, 0, .225, .15, 0, CELL.tablet, { kind: K.SIGN, em: 225, seed: 0, id: 0 }); M.c = hex(0xffffff); }, -Math.PI / 2 * 0); { const nP = M.n; } piece();
      /* swatch fan, oversize, pinked edges */
      for (let i = 0; i < 9; i++) { const c = [0x26324e, 0x6a5436, 0x3a4a3a, 0x7a2030, 0x8a7a5a, 0x2c2c34, 0x4a2a2e, 0xb8a888, 0x1f2a44][i]; M.at(fx + .02, top + .002 + i * .0032, rz + .56, -1.05 + i * .19, () => { setPlain(M, c, i % 2 ? L.HERRING : L.WEAVE); const n = 9, wid = .058, len = .3; for (let k = 0; k < n; k++) { const z0 = .04 + k * len / n, z1 = .04 + (k + 1) * len / n, j0 = k % 2 ? wid : wid * .86, j1 = k % 2 ? wid * .86 : wid; M.quad([-j0, 0, z0], [-j1, 0, z1], [j1, 0, z1], [j0, 0, z0], [-j0 * 7, z0 * 7, j1 * 7, z1 * 7]); } setPlain(M, 0xece0c0); M.box(0, .0002, .24, .05, .001, .05, {}); }); piece(); }
      M.set({ kind: K.BRASS, c: PAL.brass }); M.cyl(fx + .02, top + .002, rz + .56, .009, .009, .032, 6, {});
      /* a wave of cloth left where it was cut */
      ribbon([[fx + .2, top + .006, rz + 1.06], [fx + .08, top + .02, rz + 1.0], [fx - .04, top + .005, rz + 1.06], [fx - .14, top + .024, rz + 1.0], [fx - .2, top + .004, rz + 1.05]], .22, 12, { c: 0x3c4048, layer: L.HERRING, side: [0, 0, 1] }); piece();
    }
    /* swatch fan at the far end */
    for (let i = 0; i < 7; i++) { const c = R.pick([0x26324e, 0x5a4a3a, 0x3a4a3a, 0x6a2030, 0x8a7a5a, 0x2c2c34]); setPlain(M, c, L.HERRING); M.rbox(tx + .02, top + i * .004, rz + 1.86, .1, .004, .24, -.5 + i * .17, { uvS: 8 }); piece(); }
    /* conduit: a retrofit nobody hid, glowing where the jacket is split */
    { plain(0x1c1c22); const X = -3.72; M.cyl(X, 0, -2.3, .022, .022, H - .4, 6, { c: 0x202028, top: false }); M.cyl(X + .05, 0, -2.3, .012, .012, H - .4, 5, { c: 0x121216, top: false }); for (let y = .4; y < H - .4; y += .55) M.box(X + .02, y, -2.3, .1, .03, .07, { c: 0x34343c }); plain(0x34343c); M.box(X + .02, 1.05, -2.3, .14, .22, .14, {}); M.set({ kind: K.NEON, c: hex(PAL.cyan), seed: 200 }); M.box(X + .022, 1.1, -2.226, .09, .012, .004, {}); M.box(X + .022, 1.2, -2.226, .05, .012, .004, {}); M.tube([[X + .02, 1.06, -2.24], [X + .3, .9, -2], [-3.36, .72, -1.62], [-3.34, .96, -1.5]], .006, 10, 3, { c: 0x07070b }); piece(); }
    /* cables off the back of the register and lamp, across the top and through a grommet */
    M.tube([[tx - .25, top + .012, rz - .42], [tx - .38, top + .004, rz - .3], [tx - .4, top + .004, rz + .6], [tx - .42, top + .004, rz + 1.05], [tx - .46, top - .08, rz + 1.08], [tx - .46, .5, rz + 1.1], [tx - .44, .05, rz + 1.2]], .0035, 16, 3, { c: 0x07060c }); piece();
    M.tube([[tx - .05, top + .01, rz - 1.42], [tx - .34, top + .004, rz - 1.3], [tx - .38, top + .004, rz - .7], [tx - .3, top + .004, rz - .5]], .0035, 10, 3, { c: 0x12101a }); piece();
    /* shopping bags and tissue on the under-shelf, rolled paper */
    /* ---- ceiling services: exposed conduit and cables run along the cornice ---- */
    plain(0x1b1a24);
    M.tube([[-W + .2, H - .62, -D + .5], [-1, H - .55, -D + .4], [2, H - .58, -D + .36], [W - .3, H - .62, -D + .5]], .02, 12, 4, { c: 0x201e2a }); M.tube([[-W + .2, H - .66, -D + .46], [-1, H - .62, -D + .38], [2, H - .64, -D + .32], [W - .3, H - .7, -D + .44]], .011, 12, 3, { c: 0x07060c }); piece();
    M.tube([[W - .4, H - .56, D - .5], [1, H - .5, D - .34], [-3, H - .52, D - .36], [-W + .3, H - .58, D - .5]], .016, 12, 4, { c: 0x2a2632 }); piece();
    for (let i = 0; i < 6; i++) { M.set({ kind: K.BRASS, c: 0x6a6a74 }); M.box(-3 + i * 1.5, H - .66, -D + .38, .05, .12, .05, {}); piece(); }
    /* exposed services on the north wall: conduit, junction boxes, taped bundles, a cracked tube */
    { const z = -D + .05, yR = 3.46, X0 = .56, X1 = 5.05;
      const jb = (x, y, zz = z) => { plain(0x4c4c56); M.box(x, y - .09, zz + .02, .2, .18, .07, {}); plain(0x2c2c34); M.box(x, y - .07, zz + .058, .16, .14, .006, {}); M.set({ kind: K.BRASS, c: 0x9aa0ac }); for (const [a, b] of [[-.065, -.055], [.065, -.055], [-.065, .055], [.065, .055]]) M.cyl(x + a, y + b, zz + .062, .006, .006, .004, 5, {}); piece(); };
      M.tube([[X0, yR, z + .03], [X1, yR, z + .03]], .017, 1, 8, { c: 0x4a4a54, id: 88 }); M.tube([[X0, yR + .05, z + .03], [X1, yR + .05, z + .03]], .011, 1, 6, { c: 0x34343c, id: 89 });
      for (let x = X0 + .3; x < X1; x += .55) { M.set({ kind: K.BRASS, c: 0x7a7a84 }); M.box(x, yR - .03, z + .02, .03, .11, .05, {}); piece(); }
      jb(X0, yR); jb(1.9, yR); jb(3.6, yR); jb(X1 - .1, yR);
      M.tube([[X0, yR, z + .03], [X0, .5, z + .03]], .015, 1, 8, { c: 0x4a4a54, id: 90 }); jb(X0, 1.5); jb(X0, .5);
      for (let y = .8; y < yR; y += .5) { M.set({ kind: K.BRASS, c: 0x7a7a84 }); M.box(X0, y, z + .02, .05, .03, .05, {}); }
      /* a taped bundle sagging from the run to the fuse side */
      const bundle = [[1.9, yR - .1, z + .06], [1.4, yR - .36, z + .12], [.9, yR - .22, z + .1], [X0 + .02, yR - .1, z + .05]]; M.tube(bundle, .009, 12, 4, { c: 0x07070b }); M.tube(bundle.map(p => [p[0], p[1] - .014, p[2] + .012]), .007, 12, 3, { c: 0x5a1414 }); M.tube(bundle.map(p => [p[0], p[1] + .012, p[2] - .008]), .007, 12, 3, { c: 0x123a5a });
      for (const [x, y] of [[1.62, yR - .28], [1.25, yR - .33], [.98, yR - .25]]) { M.set({ kind: K.PLAIN, c: hex(0xd8b428), em: 0, layer: 0, id: M.nid() }); M.cyl(x, y - .02, z + .1, .024, .024, .04, 7, {}); piece(); }
    }
    /* the same on the south wall, low and magenta, a sign knocked crooked */
    { const z = D - .05; M.tube([[-.9, 3.42, z - .03], [4.9, 3.42, z - .03]], .015, 1, 8, { c: 0x4a4a54, id: 91 }); for (const x of [-.5, 1.1, 2.9, 4.6]) { plain(0x4c4c56); M.box(x, 3.33, z - .03, .18, .17, .06, {}); piece(); } M.at(4.55, 2.62, z - .03, Math.PI, () => { plain(0x101014); M.box(0, -.26, 0, .5, .52, .03, {}); M.set({ kind: K.NEON, c: hex(0xff2e88), seed: 230, layer: 0 }); M.box(0, -.04, .02, .36, .016, .012, {}); M.box(0, -.18, .02, .24, .016, .012, {}); M.box(0, -.32, .02, .3, .016, .012, {}); }, 0, .12); G(4.55, 2.5, z - .2, 0xff2e88, 1.1); piece(); }
    /* a long cold neon, split, the dead half grey, bare wire across the gap, it stutters */
    { const z = D - .1, y = 3.2, seg = (a, b) => M.at(a, y, z, 0, () => M.cyl(0, 0, 0, .017, .017, b - a, 8, {}), 0, -Math.PI / 2);
      M.set({ kind: K.NEON, c: hex(PAL.cyan), seed: 240, layer: 0 }); seg(.9, 1.84);
      plain(0x5a6a72); seg(1.98, 2.62);
      M.set({ kind: K.BRASS, c: 0xc8e8f0 }); M.at(1.84, y, z, 0, () => M.cyl(0, 0, 0, .017, .004, .05, 5, {}), 0, -Math.PI / 2); M.at(1.98, y, z, 0, () => M.cyl(0, 0, 0, .017, .004, .05, 5, {}), 0, Math.PI / 2);
      M.tube([[1.82, y, z], [1.9, y - .05, z - .03], [2, y, z]], .0022, 6, 3, { c: 0xd8c040 });
      plain(0x1a1a20); for (const x of [.92, 1.4, 2.2, 2.6]) M.box(x, y - .03, z + .03, .03, .06, .08, {}); M.box(.86, y - .03, z + .02, .08, .06, .07, {}); M.box(2.66, y - .03, z + .02, .08, .06, .07, {});
      G(1.35, y, z - .16, PAL.cyan, 1.5); G(1.9, y - .05, z - .08, [.7, .9, 1], .34, 1); piece(); piece(); piece(); }
    /* wall AC unit with a drip stain */
    plain(0x5a5a68); M.box(-1.6, 3.06, D - .14, 1, .3, .26, {}); plain(0x34343e); for (let i = 0; i < 6; i++) M.box(-1.6, 3.1 + i * .035, D - .28, .9, .012, .012, {}); piece();
    /* ---- north wall: tall shelving with shoe boxes, shirts, hats, and a brass ladder ---- */
    {
      const x0 = -2.2, x1 = .45, sz = -D + .25, w = x1 - x0, cxs = (x0 + x1) / 2;
      wood(WALD); M.box(cxs, .02, sz - .08, w, 3.3, .04, { uvS: .7 });
      for (const x of [x0, (x0 + cxs) / 2 + .02, cxs, (cxs + x1) / 2, x1]) { wood(); M.box(x, 0, sz + .02, .05, 3.34, .48, { uvS: .7 }); }
      wood(0x6e4228); M.box(cxs, 3.34, sz + .04, w + .12, .06, .52, { uvS: .7 });
      const rows = [.32, .86, 1.4, 1.94, 2.48, 2.98];
      for (const y of rows) { wood(); M.box(cxs, y - .04, sz + .02, w, .04, .47, { uvS: .7 }); M.set({ kind: K.BRASS, c: PAL.brass }); M.box(cxs, y - .05, sz + .25, w, .012, .012, {}); }
      /* shelves fill */
      for (let bay = 0; bay < 4; bay++) {
        const bx0 = x0 + bay * w / 4 + .05, bw2 = w / 4 - .08;
        rows.forEach((y, ri) => {
          const t = (bay * 3 + ri * 5) % 7;
          if (ri === 0 || t < 3) { /* shoe boxes, one by one, labels out */
            let bx = bx0; while (bx < bx0 + bw2 - .18) { const bw = .19, bh = R.range(.1, .12); let yy = y; const stack = R.int(2, 3); for (let s = 0; s < stack; s++) { const c = R.pick([0xcfc2a4, 0x2a2430, 0xb8a080, 0xd8cdb8, 0x7a2a2a, 0x24384a]); plain(c); M.box(bx + bw / 2, yy, sz + .1, bw - .01, bh, .3, {}); M.set({ kind: K.PLAIN, c: hex(mixC(c, 0xffffff, .12)) }); M.box(bx + bw / 2, yy + bh - .022, sz + .1, bw, .022, .305, {}); paper(bx + bw / 2, yy + bh * .46, sz + .253, .12, .055, 0, 'shoeL'); yy += bh + .002; piece(); } bx += bw; }
          } else if (t < 5) { /* folded shirts */
            let bx = bx0 + .02; while (bx < bx0 + bw2 - .24) { let yy = y; const n = R.int(4, 7); const col = R.pick([0xe8e4dc, 0xb8c8dc, 0xdcd0c0, 0xf0d8dc, 0x8ea2bc]); for (let s = 0; s < n; s++) { setPlain(M, s % 3 === 2 ? mixC(col, 0x2a3a5a, .2) : col, L.WEAVE); M.box(bx + .13, yy, sz + .08, .25, .036, .3, { uvS: 7 }); yy += .037; piece(); } bx += .28; }
          } else if (t === 5) { /* hat boxes */
            let bx = bx0 + .14; for (let k = 0; k < 2; k++) { if (bx > bx0 + bw2 - .1) break; setPlain(M, R.pick([0x5a1e2c, 0x1e3a4a, 0xc0a878])); M.cyl(bx, y, sz + .12, .14, .14, .2, 10, {}); M.cyl(bx, y + .2, sz + .12, .15, .15, .035, 10, { c: 0x2a2430 }); bx += .3; piece(); }
          } else { /* books, bags, a little drone sleeping on its pad */
            let bx = bx0 + .02; while (bx < bx0 + bw2 - .04) { const bw = R.range(.03, .055), bh = R.range(.2, .34); plain(R.pick([0x5a1e2c, 0x1e3a4a, 0x2a4a2a, 0x8a6a2a, 0x3a2a4a])); M.rbox(bx + bw / 2, y, sz + .1, bw, bh, .22, 0, {}); bx += bw + .002; piece(); }
          }
        });
      }
      /* ladder on a rail */
      M.set({ kind: K.BRASS, c: PAL.brass }); M.box(cxs, 3.12, sz + .33, w, .02, .02, {});
      const lx = -.9; for (const dx of [-.18, .18]) M.beam([lx + dx, 3.14, sz + .32], [lx + dx, 0, sz + .92], .025, { c: PAL.brass });
      for (let i = 0; i < 9; i++) { const t = (i + .5) / 9; wood(); M.box(lx, 3.14 * (1 - t) - .012, sz + .32 + .6 * t, .36, .024, .05, { uvS: .7 }); } piece();
    }
    /* ---- jackets ---- */
    const CLOTH = [[0x1f2a44, L.WEAVE], [0x2d2f38, L.WEAVE], [0x3c4048, L.HERRING], [0x6a5436, L.HERRING], [0x7c6848, L.HERRING], [0x4a2a2e, L.WEAVE], [0x2a3a30, L.HERRING], [0x38424e, L.WEAVE], [0x8a7a62, L.WEAVE], [0x232634, L.WEAVE], [0x57202a, L.HERRING], [0x46506a, L.HERRING]];
    const jacket = (x, y, z, ry, col) => {
      const [c, lay] = col; const lc = mixC(c, 0x000000, .28), lc2 = mixC(c, 0xffffff, .1);
      M.at(x, y, z, ry, () => {
        /* hanger: hook, shoulder bar */
        M.set({ kind: K.BRASS, c: 0xc9a050 }); M.tube([[0, .0, 0], [.02, .035, 0], [0, .05, 0], [-.012, .035, 0], [0, -.04, 0]], .0035, 6, 3, { c: 0xc9a050 });
        wood(0x8a5a30); M.rbox(-.12, -.07, 0, .24, .018, .03, 0, { uvS: 3 }); M.rbox(.12, -.07, 0, .24, .018, .03, 0, { uvS: 3 });
        /* body rings */
        const ell = (w, d, yy, sq = 1, fw = 0) => { const P = []; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const cs = Math.cos(a), sn = Math.sin(a); P.push([cs * w * .5, yy + (Math.abs(sn) < .3 ? (Math.abs(cs)) * -.012 : 0), sn * d * .5 + fw]); } return P; };
        setPlain(M, c, lay);
        const rings = [ell(.2, .09, -.09), ell(.44, .13, -.13), ell(.46, .17, -.28, 1, .01), ell(.405, .14, -.5, 1, .01), ell(.44, .15, -.72, 1, .012), ell(.45, .16, -.78, 1, .01)];
        M.loft(rings, { flip: true, uvS: 3, grad: .55, fold: 3 });
        /* hem and neck caps */
        setPlain(M, lc); M.loft([ell(.45, .16, -.78, 1, .01), ell(.02, .02, -.78, 1, .01)], { flip: true });
        /* sleeves */
        for (const s of [1, -1]) { setPlain(M, s > 0 ? c : mixC(c, 0x000000, .06), lay); M.tube([[s * .2, -.14, 0], [s * .245, -.3, .006], [s * .26, -.5, .03], [s * .25, -.72, .05]], u => lerp(.066, .046, u), 5, 6, { uvS: 3 }); setPlain(M, lc); M.box(s * .25, -.72, .05, .1, .012, .094, { crease: false }); M.box(s * .302, -.5, .03, .003, .34, .012, {}); M.box(s * .232, -.44, -.056, .012, .24, .004, {}); M.box(s * .23, -.56, .064, .03, .004, .03, {}); for (let b = 0; b < 3; b++) { M.set({ kind: K.BRASS, c: 0xc0a060 }); M.cyl(s * .25, -.68 + b * .018, .096, .005, .005, .003, 4, {}); } }
        /* front: shirt opening, lapels, pocket, buttons */
        const fz = .092; M.set({ kind: K.PLAIN, layer: 0, c: hex(lc), id: M.nid() });
        M.tri([0, -.1, fz], [-.075, -.15, fz + .003], [0, -.42, fz + .012]); M.tri([0, -.1, fz], [0, -.42, fz + .012], [.075, -.15, fz + .003]);
        setPlain(M, lc2, lay); M.id = M.nid();
        for (const s of [1, -1]) { const a = [s * .05, -.11, fz + .006], b = [s * .135, -.2, fz + .018], c0 = [s * .1, -.235, fz + .022], d = [s * .012, -.42, fz + .03]; if (s > 0) { M.tri(a, d, b); M.tri(d, c0, b); } else { M.tri(a, b, d); M.tri(d, b, c0); } }
        setPlain(M, lc, 0); M.box(.09, -.555, fz + .004, .1, .022, .006, {}); M.box(-.09, -.555, fz + .004, .1, .022, .006, {}); M.box(0, -.76, -.078, .006, .3, .004, {}); for (const s of [1, -1]) { M.box(s * .205, -.58, .0, .004, .03, .1, {}); M.box(s * .1, -.65, .09, .004, .26, .004, {}); } M.box(-.1, -.285, fz + .018, .07, .014, .004, {});
        if (R.chance(.4)) { setPlain(M, R.pick([0xf0e8d8, 0xb02a3a, 0xe0b040])); M.box(-.1, -.276, fz + .02, .05, .022, .004, {}); }
        M.set({ kind: K.BRASS, c: 0xb8985a }); M.cyl(.01, -.42, fz + .03, .009, .009, .003, 5, {}); M.cyl(.01, -.5, fz + .025, .009, .009, .003, 5, {});
        if (R.chance(.5)) paper(.27, -.72, .1, .03, .054, 0, 'tag');
      });
      piece();
    };
    const rail = (x0, x1, z, y, n, cols) => {
      M.set({ kind: K.BRASS, c: PAL.brass }); M.at(0, 0, 0, 0, () => M.tube([[x0, y, z], [x1, y, z]], .017, 1, 6, { c: PAL.brass }));
      for (let i = 0; i < n; i++) { const t = (i + .5) / n; const x = lerp(x0, x1, t) + R.range(-.012, .012); jacket(x, y - .012, z, -Math.PI / 2 + R.range(-.07, .07), cols[i % cols.length]); }
    };
    const pickCols = (n) => { const a = []; for (let i = 0; i < n; i++) a.push(R.pick(CLOTH)); return a; };
    /* north wall rail, with brackets */
    rail(.7, 4.75, -D + .46, 2.02, 20, pickCols(20));
    M.set({ kind: K.BRASS, c: PAL.brass }); for (const x of [.7, 2.7, 4.75]) M.box(x, 2, -D + .22, .03, .03, .46, {});
    /* upper rail too, tighter */
    /* south wall rail */
    rail(-1.2, 2.1, D - .46, 2.02, 14, pickCols(14));
    for (const x of [-1.2, .4, 2.1]) M.box(x, 2, D - .22, .03, .03, .46, {});
    /* shelf above each rail with cartons */
    for (const [x0, x1, z] of [[.7, 4.75, -D + .2], [-1.2, 2.1, D - .2]]) { wood(); M.box((x0 + x1) / 2, 2.44, z, x1 - x0 + .1, .035, .38, { uvS: .7 }); let x = x0 + .05; while (x < x1 - .3) { const w = R.range(.24, .42), h = R.range(.16, .3); plain(R.pick([0xb09a78, 0xa08860, 0xc8b89a, 0x2a2430])); M.box(x + w / 2, 2.475, z, w, h, .3, {}); M.set({ kind: K.PLAIN, c: hex(0xd8c890) }); M.box(x + w / 2, 2.475 + h, z, .05, .004, .3, {}); const fz0 = z > 0 ? z - .153 : z + .153; if (R.chance(.65)) paper(x + w / 2, 2.475 + h * .5, fz0, Math.min(.13, w * .6), .06, z > 0 ? Math.PI : 0, 'shoeL'); x += w + R.range(.03, .12); piece(); } }
    /* rolling rail in the middle of the floor */
    { const x0 = 1.2, x1 = 3.5, z = -1.9, y = 1.86;
      M.set({ kind: K.BRASS, c: PAL.brass });
      for (const x of [x0, x1]) { M.cyl(x, .08, z, .016, .016, y - .08, 5, { top: false, c: PAL.brass }); M.box(x, .07, z, .05, .02, .62, { c: PAL.brass }); for (const dz of [-.3, .3]) { plain(0x121018); M.cyl(x, 0, z + dz, .035, .035, .06, 6, {}); M.set({ kind: K.BRASS, c: PAL.brass }); } }
      rail(x0, x1, z, y, 12, pickCols(12));
    }
    /* central table with folded shirts */
    { const tx0 = -.55, tz0 = .35, w = 1.9, d = 1.05, y = .78;
      wood(); M.box(tx0, y - .045, tz0, w, .05, d, { uvS: .7 }); wood(WALD); M.box(tx0, y - .13, tz0, w - .1, .085, d - .1, { uvS: .7 });
      M.set({ kind: K.BRASS, c: PAL.brass }); M.box(tx0, y - .005, tz0, w + .01, .008, d + .01, {}); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) M.cyl(tx0 + sx * (w / 2 - .08), 0, tz0 + sz * (d / 2 - .08), .016, .026, y - .13, 6, { top: false, c: PAL.brass });
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
        const x = tx0 - w / 2 + .28 + i * .46, z = tz0 - .24 + j * .48; const col = R.pick([0xece8e0, 0xbcd0e6, 0xdcd2c2, 0xf0d6dc, 0x8ea6c6, 0xdce6dc, 0xc8b8d8]); let yy = y + .004; const n = R.int(4, 8);
        for (let s = 0; s < n; s++) {
          const cc = s % 4 === 3 ? mixC(col, 0x1a2a4a, .25) : col, ang = R.range(-.03, .03);
          if (s >= Math.ceil(n / 2)) continue;
          M.at(x, yy, z, ang, () => { setPlain(M, cc, L.WEAVE); M.box(0, 0, 0, .36, .034, .27, { uvS: 7 }); setPlain(M, mixC(cc, 0x000000, .12)); M.box(0, .01, .136, .36, .014, .006, {}); });
          yy += .035; piece();
        }
        /* top shirt: collar and placket */
        setPlain(M, mixC(col, 0xffffff, .3));
        M.at(x, yy, z, 0, () => { M.box(.1, 0, 0, .1, .012, .13, {}); M.box(0, -.002, 0, .03, .005, .24, { c: mixC(col, 0x000000, .08) }); for (let b = 0; b < 3; b++) { M.set({ kind: K.PLAIN, c: hex(0xf8f8f8) }); M.cyl(0, .001, -.07 + b * .06, .005, .005, .003, 4, {}); setPlain(M, col); } });
        if (R.chance(.6)) { M.set({ kind: K.PAPER, em: 0 }); paper(x + .1, yy + .012, z - .08, .04, .07, .4, 'tag', -Math.PI / 2); }
      }
      /* price stand */
      M.set({ kind: K.BRASS, c: PAL.brass }); M.cyl(tx0 + .62, y, tz0 + .4, .05, .05, .006, 8, {}); M.cyl(tx0 + .62, y, tz0 + .4, .004, .004, .13, 3, { top: false }); paper(tx0 + .62, y + .16, tz0 + .4, .17, .09, -Math.PI / 2, 'sale'); piece();
    }
    /* the tailor's form, jacket half built, pinned and chalked */
    { const fx = .15, fz = -2.65; const y0 = 0;
      M.set({ kind: K.BRASS, c: PAL.brass }); M.cyl(fx, 0, fz, .02, .02, 1, 5, { top: false, c: PAL.brass });
      wood(WALD); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + .4; M.beam([fx, .24, fz], [fx + Math.cos(a) * .32, .01, fz + Math.sin(a) * .32], .03, {}); }
      setPlain(M, 0xcdbf9c, L.WEAVE);
      const prof = [[.1, 0], [.18, .02], [.17, .2], [.15, .34], [.2, .52], [.24, .66], [.19, .76], [.07, .8], [.055, .9], [.075, .92], [.0, .93]];
      M.lathe(fx, .9, fz, prof, 40, { c: 0xcdbf9c, sq: .72 });
      M.at(fx, .9 + .92, fz, .35, () => { M.set({ kind: K.BRASS, c: PAL.brass }); M.lathe(0, 0, 0, [[0, 0], [.02, .01], [.012, .04]], 6, {}); });
      /* unfinished jacket: one sleeve on, canvas showing, white basting */
      const fy = .9;
      M.at(fx, fy, fz, .35, () => {
        setPlain(M, 0x2c3350, L.HERRING);
        const ell = (w, d, yy, a0 = -.2, a1 = 3.34) => { const P = []; for (let i = 0; i < 36; i++) { const a = lerp(a0, a1, i / 35); P.push([Math.cos(a) * w, yy, Math.sin(a) * d]); } return P; };
        const jr = new THREE.CatmullRomCurve3([[.2, .15, .02], [.215, .165, .22], [.2, .15, .38], [.245, .185, .58], [.262, .2, .7], [.21, .17, .78]].map(v => new THREE.Vector3(...v))).getPoints(14).map(v => ell(v.x, v.y, v.z));
        M.loft(jr, { flip: true, uvS: 3, grad: .6 });
        M.loft(jr.map(r => r.map(p => [p[0] * .98, p[1], p[2] * .98])), { uvS: 3 });
        setPlain(M, 0x2c3350, L.HERRING); M.tube([[.26, .72, 0], [.3, .5, .03], [.3, .3, .06], [.28, .14, .09]], t => lerp(.075, .05, t), 5, 6, { uvS: 3 });
        /* basting stitches and chalk marks */
        for (let i = 0; i < 16; i++) { const a = -.1 + i * .22, yy = .36; M.set({ kind: K.PLAIN, c: hex(0xf4f0e0), em: 0 }); M.beam([Math.cos(a) * .206, yy, Math.sin(a) * .157], [Math.cos(a + .08) * .206, yy, Math.sin(a + .08) * .157], .0035, {}); piece(); }
        for (let i = 0; i < 12; i++) { M.set({ kind: K.PLAIN, c: hex(0xf4f0e0) }); const yy = .1 + i * .05; M.box(.05, yy, .165 + (yy > .4 ? .012 : 0), .022, .004, .002, {}); }
        for (let i = 0; i < 10; i++) { const a = R.range(.5, 2.6), yy = R.range(.1, .7); M.set({ kind: K.BRASS, c: 0xe8ecf4 }); M.cyl(Math.cos(a) * .24, yy, Math.sin(a) * .2, .002, .002, .03, 3, {}); piece(); }
        /* pattern pieces pinned on */
        setPlain(M, 0xe8dcb8); M.rbox(-.1, .5, .187, .1, .16, .004, .2, {});
      });
      /* tape over its shoulders */
      M.tube([[fx - .22, fy + .75, fz + .1], [fx - .1, fy + .83, fz + .06], [fx + .08, fy + .84, fz + .06], [fx + .22, fy + .75, fz + .13], [fx + .24, fy + .4, fz + .17]], .009, 12, 3, { c: 0xe8cc58 });
      piece();
      /* low stool with spools, a bin of offcuts on the floor */
      wood(); M.cyl(fx + .75, .42, fz + .2, .17, .17, .03, 8, {}); M.cyl(fx + .75, .0, fz + .2, .02, .02, .42, 4, {}); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; M.beam([fx + .75, .3, fz + .2], [fx + .75 + Math.cos(a) * .17, 0, fz + .2 + Math.sin(a) * .17], .018, {}); }
      setPlain(M, 0x3a3a48); M.cyl(fx - .62, 0, fz + .3, .17, .2, .38, 8, { c: 0x2a2a34, top: false });
      for (let i = 0; i < 6; i++) { setPlain(M, R.pick([0x26324e, 0x5a4a3a, 0x6a2030, 0xe8dcb8]), L.HERRING); M.rbox(fx - .62 + R.range(-.1, .1), .34, fz + .3 + R.range(-.1, .1), .14, .02, .08, R() * 3, { uvS: 7 }); piece(); }
    }
    /* a fit scanner bolted on next to the form: rings of light and a readout */
    { const fx = .15, fz = -2.65, X = SHOP.x + fx, Z = SHOP.z + fz;
      const seg = 32, ell = .8;
      /* soft cone: no box edges, gone before the top */
      FXM.set({ kind: 1, a: 225, c: [.16, .78, 1] }); for (let i = 0; i < seg; i++) { const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU; const P = (a, y, r) => [X + Math.cos(a) * r, y, Z + Math.sin(a) * r * ell]; FXM.quad(P(a0, .05, .4), P(a1, .05, .4), P(a1, 1.9, .5), P(a0, 1.9, .5), [0, 0, 1, 1]); }
      /* three rings that climb the form, thin */
      [0, 85, 170].forEach(sd => { FXM.set({ kind: 8, a: 215, c: [.3, .95, 1], seed: sd }); const r = .4, r1 = r + .016; for (let i = 0; i < seg; i++) { const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU; const Pt = (a, q) => [X + Math.cos(a) * q, .1, Z + Math.sin(a) * q * ell]; FXM.quad(Pt(a0, r), Pt(a1, r), Pt(a1, r1), Pt(a0, r1)); FXM.quad(Pt(a0, r1), Pt(a1, r1), Pt(a1, r), Pt(a0, r)); } });
      FXM.set({ seed: 0 });
      /* sparse wire: a few meridians following the body, fading at the feet */
      { const prof2 = [[.27, .9], [.3, 1.2], [.34, 1.46], [.27, 1.66], [.1, 1.76]]; FXM.set({ kind: 5, a: 130, c: [.3, .9, 1] }); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + .2, ca = Math.cos(a), sa = Math.sin(a), tx0 = -sa * .0035, tz0 = ca * .0035 * ell; for (let j = 0; j < prof2.length - 1; j++) { const [r0, y0] = prof2[j], [r1, y1] = prof2[j + 1]; const A = [X + ca * r0, y0, Z + sa * r0 * ell], B = [X + ca * r1, y1, Z + sa * r1 * ell]; FXM.quad([A[0] - tx0, A[1], A[2] - tz0], [A[0] + tx0, A[1], A[2] + tz0], [B[0] + tx0, B[1], B[2] + tz0], [B[0] - tx0, B[1], B[2] - tz0]); } } }
      /* cyan lying on the floor and on the nearest jackets */
      FXM.set({ kind: 7, a: 120, c: [.1, .72, .9] }); FXM.quad([X - 1.25, .064, Z + 1.05], [X + 1.25, .064, Z + 1.05], [X + 1.25, .064, Z - 1.05], [X - 1.25, .064, Z - 1.05], [0, 0, 1, 1]);
      G(fx - .4, 1.15, fz - .3, [.03, .2, .25], 2.1); G(fx, .25, fz, [.04, .34, .42], 1.3);
      /* the emitter on the floor, the readout on an arm */
      plain(0x16161c); M.cyl(fx, 0, fz, .44, .46, .03, 16, { c: 0x1c1c22 }); M.set({ kind: K.NEON, c: hex(PAL.cyan), seed: 0 }); M.cyl(fx, .03, fz, .42, .42, .006, 16, { top: false });
      plain(0x202028); M.beam([fx + .34, .03, fz + .28], [fx + .46, 1.3, fz + .3], .022, { c: 0x26262e }); M.at(fx + .5, 1.42, fz + .34, -Math.PI / 2, () => { M.plate(0, 0, 0, .36, .45, 0, CELL.holo, { kind: K.SIGN, em: 235, seed: 0, id: 0 }); }); G(fx + .46, 1.42, fz + .34, [.05, .4, .5], 1); piece(); piece(); }
    /* steamer with its hose, beside the mirror */
    { const sx = 2.55, sz = D - .55;
      setPlain(M, 0x1f3a40); M.cyl(sx, .08, sz, .13, .15, .3, 10, { c: 0x2c5058 }); M.lathe(sx, .36, sz, [[.13, 0], [.06, .04], [.03, .05]], 8, { c: 0xd8dce4 });
      plain(0x101018); for (const [dx, dz] of [[.1, .1], [-.1, .1], [.1, -.1], [-.1, -.1]]) M.cyl(sx + dx, 0, sz + dz, .025, .025, .08, 5, {});
      M.set({ kind: K.BRASS, c: 0xc0c4cc }); M.cyl(sx + .02, .36, sz, .012, .012, 1.3, 5, { top: false, c: 0xc0c4cc }); M.box(sx + .02, 1.66, sz, .26, .012, .03, { c: 0xc0c4cc });
      M.tube([[sx - .08, .36, sz], [sx - .3, .75, sz - .12], [sx - .2, 1.2, sz - .2], [sx - .02, 1.3, sz - .05]], .014, 12, 4, { c: 0x16161e });
      plain(0x242430); M.rbox(sx - .01, 1.28, sz - .03, .08, .1, .05, .3, {}); M.set({ kind: K.NEON, c: hex(PAL.red), seed: 0 }); M.box(sx - .06, .2, sz + .13, .02, .02, .02, {}); piece(); piece();
      G(sx - .01, 1.45, sz - .03, 0xc8d4ff, .6);
    }
    /* full length tri-fold mirror */
    { const mx = 3.55, mz = D - .22; const pan = (x, ry, w) => { M.at(x, 0, mz, ry, () => { M.set({ kind: K.BRASS, c: PAL.brass }); M.box(0, .05, -.02, w + .08, 2.1, .03, {}); M.set({ kind: K.MIRROR, em: 0, id: 0, c: [1, 1, 1], seed: 0 }); M.quad([w / 2, .09, -.04], [-w / 2, .09, -.04], [-w / 2, 2.11, -.04], [w / 2, 2.11, -.04], [0, 0, w, 2]); }); }; pan(mx, 0, .78); pan(mx - .68, -.34, .55); pan(mx + .68, .34, .55);
      plain(0x4a2030); M.box(mx, 0, mz - .5, 1.05, .1, .6, {}); wood(WALD); M.box(mx, 0, mz - .5, 1.12, .03, .66, { uvS: .7 }); piece();
    }
    /* swatch books on a stand */
    { const x = 1.0, z = D - 1.25 + .4;
      wood(WALD); M.box(x, 0, z, .7, 1.02, .34, { uvS: .7 });
      for (let i = 0; i < 9; i++) { M.at(x - .3 + i * .075, 1.02, z, 0, () => { const c = R.pick([0x26324e, 0x5a4a3a, 0x3a4a3a, 0x6a2030, 0x8a7a5a, 0x2c2c34, 0x3a2c44, 0x7a5a30]); setPlain(M, c, L.HERRING); M.box(0, 0, 0, .05, .34, .3, { uvS: 6 }); plain(0xdcd0b0); M.box(0, .3, -.14, .052, .03, .014, {}); }, 0, R.range(-.18, .18)); piece(); }
      paper(x, 1.2, z - .19, .3, .16, Math.PI, 'sw0');
      /* open sample book on top */
      setPlain(M, 0x2a2430); M.box(x + .55, .75, z, .5, .025, .4, {}); wood(WALD); M.box(x + .55, 0, z, .5, .75, .4, { uvS: .7 }); for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { setPlain(M, R.pick([0x26324e, 0x5a4a3a, 0x8a7a5a, 0x6a2030]), L.HERRING); M.rbox(x + .38 + i * .07, .776, z - .08 + j * .17, .06, .004, .14, R.range(-.04, .04), { uvS: 10 }); piece(); }
    }
    /* wet umbrellas in a stand by the door, puddle on the wood */
    { const x = 4.75, z = 3.6;
      setPlain(M, 0x2a3036); M.cyl(x, 0, z, .17, .19, .55, 10, { top: false, c: 0x34404a }); M.set({ kind: K.BRASS, c: PAL.brass }); M.cyl(x, .5, z, .185, .185, .03, 10, { top: false }); M.cyl(x, .06, z, .195, .195, .03, 10, { top: false });
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; const lean = .1 + .06 * (i % 2), dx = Math.cos(a) * lean, dz = Math.sin(a) * lean, c = [0x101420, 0x4a1420, 0x1a2a2a, 0x201a2a, 0xa83a2a][i];
        const P0 = [x + dx * .2, .02, z + dz * .2], P1 = [x + dx * 2.6, .98, z + dz * 2.6];
        M.at(P0[0], P0[1], P0[2], Math.atan2(dx, dz), () => { setPlain(M, c); M.lathe(0, .15, 0, [[.006, 0], [.03, .02], [.07, .12], [.066, .55], [.016, .72]], 7, { c }); M.cyl(0, .86, 0, .005, .005, .13, 3, {}); M.set({ kind: K.BRASS, c: i % 2 ? PAL.brass : 0x4a2a1a }); M.tube([[0, 1, 0], [0, 1.06, 0], [.03, 1.09, 0], [.05, 1.06, 0]], .008, 5, 3, {}); }, Math.atan2(Math.hypot(dx * 2.4, dz * 2.4), .96));
        piece();
      }
      /* puddles: flat bright shapes */
      for (let i = 0; i < 5; i++) { const px = x + R.range(-.45, .35), pz = z + R.range(-.5, .35), r = R.range(.1, .28); M.set({ kind: K.BRASS, c: 0x4a3a5a, em: 0, id: 11 }); const seg = 9; for (let k = 0; k < seg; k++) { const a0 = k / seg * TAU, a1 = (k + 1) / seg * TAU; const j0 = 1 + .22 * Math.sin(a0 * 3 + i), j1 = 1 + .22 * Math.sin(a1 * 3 + i); M.tri([px, .056, pz], [px + Math.cos(a1) * r * j1, .056, pz + Math.sin(a1) * r * j1 * .7], [px + Math.cos(a0) * r * j0, .056, pz + Math.sin(a0) * r * j0 * .7]); } piece(); }
      /* mat */
      setPlain(M, 0x1c1a20, L.ASPHALT); M.box(4.5, .05, 1.6, 1.3, .014, 2, { uvS: 3 });
    }
    /* stacked cartons of new stock, taped, in the corner by the shelves */
    { let x = -1.9, z = -2.75; const box = (bx, y, bz, w, h, d, c) => { plain(c); M.rbox(bx, y, bz, w, h, d, R.range(-.09, .09), {}); M.set({ kind: K.PLAIN, c: hex(0xd8c890) }); M.box(bx, y + h, bz, .06, .002, d, {}); M.box(bx, y + h * .4, bz + d / 2 + .002, .1, .05, .002, { c: 0xefe8d8 }); piece(); };
      box(-1.92, 0, -3.5, .62, .42, .5, 0xa08860); box(-1.9, .42, -3.48, .55, .36, .44, 0xb09a78); box(-1.3, 0, -3.42, .5, .34, .44, 0x90785a); box(-1.3, .34, -3.44, .36, .26, .34, 0xc8b89a); box(-2.0, .78, -3.46, .34, .22, .3, 0xa08860);
      /* shoe display on a low bench: pairs modelled */
      wood(); M.box(1.0, .36, -3.2 + .75, .01, .01, .01, {});
    }
    /* shoes on a low bench under the north rail */
    { wood(); M.box(2.7, .32, -D + .46, 4, .04, .42, { uvS: .7 }); wood(WALD); for (const x of [.8, 2.7, 4.65]) M.box(x, 0, -D + .46, .05, .32, .36, { uvS: .7 });
      const shoe = (x, z, c, ry) => { M.at(x, .36, z, ry, () => { setPlain(M, c, L.LEATHER); const rings = []; const sec = [[-.14, .03, .035], [-.1, .1, .04], [-.04, .1, .042], [.04, .06, .044], [.12, .045, .04], [.15, .03, .026]]; for (const [zz, hh, w] of sec) { rings.push([[-w, .012, zz], [w, .012, zz], [w * .8, hh, zz], [-w * .8, hh, zz]]); } M.loft(rings, { uvS: 6, grad: .7, flip: false }); plain(0x0e0c12); M.box(0, 0, 0, .085, .012, .31, {}); }); piece(); };
      for (let i = 0; i < 8; i++) { const x = 1.05 + i * .47, c = R.pick([0x2a1408, 0x4a2412, 0x121014, 0x5a3418, 0x3a0f14]); shoe(x - .055, -D + .47, c, .03); shoe(x + .055, -D + .47, c, -.03); }
    }
    /* framed pieces, posters, a wall TV showing rain news */
    { const fr = (x, y, z, w, h, ry, cell) => { M.at(x, y, z, ry, () => { M.set({ kind: K.BRASS, c: PAL.brass }); M.box(0, -h / 2 - .02, 0, w + .05, h + .05, .02, {}); paper(0, 0, .014, w, h, 0, cell); }); piece(); };
      fr(-3.6, 2.18, D - .02, .34, .44, Math.PI, 'frame'); fr(-3.1, 2.3, D - .02, .3, .38, Math.PI, 'frame'); fr(-2.6, 2.1, D - .02, .28, .38, Math.PI, CELL.posters[1]); fr(.92, 3.08, -D + .03, .32, .42, 0, CELL.posters[3]); fr(4.08, 3.06, -D + .03, .36, .5, 0, 'frame'); fr(4.6, 3.1, -D + .03, .32, .46, 0, CELL.posters[2]);
      paper(-1.9, 3.0, D - .02, .46, .24, Math.PI, 'sale'); piece();
      plain(0x0e0d14); M.box(3.1, 2.62, D - .05, .92, .58, .05, {}); M.at(3.1, 2.91, D - .08, Math.PI, () => M.plate(0, 0, 0, .84, .5, 0, CELL.tv, { seed: 240, em: 215 })); G(3.1, 2.9, D - .3, PAL.cyan, 1.1); M.tube([[3.5, 2.62, D - .05], [3.72, 2.3, D - .03], [3.74, 1.1, D - .03]], .006, 6, 3, { c: 0x07060c }); piece();
    }
    /* wall neon in the shop: scissors drawn in one tube, above the rail */
    { const y = 3.02, z = D - .07, x0 = .3;
      const tube = (pts, c) => M.tube(pts, .018, Math.max(4, pts.length * 3), 5, { c, tension: .1 });
      M.set({ kind: K.NEON, seed: 0, layer: 0, c: hex(PAL.magenta) }); tube([[x0 - .34, y - .22, z], [x0, y, z], [x0 + .34, y + .2, z]], PAL.magenta); tube([[x0 - .34, y + .2, z], [x0, y, z], [x0 + .34, y - .22, z]], PAL.magenta);
      const ring = (cx, cy, r) => { const p = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU; p.push([cx, cy + Math.sin(a) * r, z + 0]); p[i][0] = cx + Math.cos(a) * r; } tube(p, PAL.cyan); };
      M.set({ kind: K.NEON, c: hex(PAL.cyan) }); ring(x0 - .44, y - .28, .1); ring(x0 - .44, y + .26, .1); G(x0, y, z - .1, PAL.magenta, 2); piece();
    }
    /* the work corner on the north wall, left of the shelves: peg rail, garment bags, calendar, fuse box */
    { const z = -D + .03;
      wood(WALD); M.box(-3.9, 2.1, z + .02, 2.5, .09, .04, { uvS: .7 });
      for (let i = 0; i < 7; i++) { M.set({ kind: K.BRASS, c: PAL.brass }); M.box(-4.95 + i * .35, 2.1, z + .07, .02, .05, .08, {}); piece(); }
      /* garment bags on the pegs, zipped, with tickets */
      for (const [x, c] of [[-4.95, 0x1c2a3a], [-4.6, 0x2a2430], [-4.25, 0x3a2a24]]) { setPlain(M, c, L.WEAVE); M.lathe(x, .92, z + .14, [[.2, 0], [.26, .4], [.25, .9], [.14, 1.08], [.02, 1.14]], 8, { c, sq: .4, uvS: 3 }); plain(0xc9c0a8); M.box(x, 1.02, z + .25, .012, .95, .006, {}); paper(x + .1, 1.72, z + .23, .05, .09, 0, 'tag'); piece(); }
      /* tape, shears and rulers hanging up */
      M.set({ kind: K.BRASS, c: 0xc8d0dc }); M.box(-3.5, 1.6, z + .05, .03, .5, .01, {}); M.box(-3.42, 1.72, z + .05, .03, .36, .01, {}); plain(0x151320); M.lathe(-3.5, 1.56, z + .05, [[.02, 0], [.04, .01], [.02, .03]], 6, {}); piece();
      wood(0xb08a50); M.box(-3.2, 1.2, z + .05, .05, .9, .012, { uvS: 3 }); for (let i = 0; i < 12; i++) { plain(0x201810); M.box(-3.2, 1.22 + i * .07, z + .058, .03, .004, .002, {}); } piece();
      M.tube([[-2.95, 2.08, z + .06], [-2.9, 1.7, z + .08], [-3, 1.3, z + .08], [-2.92, 1, z + .06]], .012, 10, 3, { c: 0xe8cc58 }); piece();
      /* calendar and notes pinned above the rail */
      paper(-4.45, 2.62, z + .01, .42, .56, 0, 'ledgerR'); paper(-3.92, 2.56, z + .01, .22, .3, 0, 'notepad'); paper(-3.62, 2.68, z + .01, .3, .4, 0, CELL.posters[4]); paper(-3.14, 2.6, z + .01, .22, .3, .0, 'ticket'); for (let i = 0; i < 4; i++) piece();
      /* fuse box with conduit up to the ceiling run */
      plain(0x4a4a56); M.box(-2.72, 1.92, z + .05, .3, .42, .1, {}); plain(0x2a2a34); M.box(-2.72, 1.96, z + .105, .24, .32, .01, {}); M.set({ kind: K.NEON, c: hex(PAL.green), seed: 0 }); M.box(-2.8, 2.24, z + .112, .02, .02, .005, {}); M.set({ kind: K.NEON, c: hex(PAL.red), seed: 240 }); M.box(-2.75, 2.24, z + .112, .02, .02, .005, {});
      M.cyl(-2.72, 2.34, z + .05, .016, .016, 1.1, 5, { c: 0x34343e, top: false }); M.tube([[-2.8, 1.92, z + .07], [-2.85, 1.2, z + .08], [-2.75, .9, z + .05]], .006, 6, 3, { c: 0x07060c }); piece(); piece();
      /* small shelf with a radio, a mug of pencils */
      wood(); M.box(-4.1, 1.76, z + .1, .01, .01, .01, {});
    }
    /* a plant and a coat stand in the far corner, a holo size chart that hums */
    { const x = 4.6, z = -2.9; plain(0x4a2a1a); M.lathe(x, 0, z, [[0, 0], [.14, 0], [.2, .34], [.17, .36]], 8, { c: 0x6a3a2a }); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + R(), L0 = R.range(.6, 1.1); M.set({ kind: K.PLAIN, c: hex(R.pick([0x1a4a34, 0x24603e, 0x123a2a])), em: 0, id: M.nid() }); const P = (t, w) => [x + Math.cos(a) * L0 * t * .55 + Math.sin(a) * w, .36 + L0 * (t * 1.05 - t * t * .32), z + Math.sin(a) * L0 * t * .55 - Math.cos(a) * w]; for (let j = 0; j < 3; j++) { const t0 = j / 3, t1 = (j + 1) / 3, w0 = [.01, .05, .04][j], w1 = [.05, .04, .002][j]; M.quad(P(t0, -w0), P(t0, w0), P(t1, w1), P(t1, -w1)); M.quad(P(t1, -w1), P(t1, w1), P(t0, w0), P(t0, -w0)); } piece(); } }
    { const x = 4.65, z = -1.4; plain(0x101018); M.box(x, 0, z, .3, .9, .3, {}); M.set({ kind: K.BRASS, c: PAL.brass }); M.box(x, .88, z, .34, .02, .34, {});
      /* window display: hat on a stand, folded scarves, pair of brogues */
      M.cyl(x, .9, z, .012, .012, .34, 4, {}); setPlain(M, 0x2e2a24, L.WEAVE); M.lathe(x, 1.24, z, [[.18, 0], [.16, .012], [.09, .02], [.08, .1], [.0, .12]], 10, { c: 0x4a4032 }); piece();
      for (let i = 0; i < 4; i++) { setPlain(M, R.pick([0x5a1e2c, 0xc0a878, 0x1e3a4a]), L.HERRING); M.box(4.5, .47 + i * .025, -2.5, .36, .024, .26, { uvS: 8 }); piece(); }
    }
    /* floor clutter behind the counter: bag of hangers, a stool, a box of tags */
    { wood(); M.cyl(-4.1, .62, -1.9, .17, .17, .03, 8, {}); M.cyl(-4.1, 0, -1.9, .02, .02, .62, 4, {});
      plain(0x2a2430); M.box(-3.9, 0, 1.0, .5, .3, .4, {}); for (let i = 0; i < 16; i++) { wood(0x8a5a30); M.rbox(-3.9 + R.range(-.2, .2), .3 + R.range(0, .04), 1 + R.range(-.14, .14), .36, .012, .025, R() * 3, { uvS: 3 }); piece(); }
      /* back wall shelves: tissue, bags and boxes */
      const bz0 = -3.6; for (let j = 0; j < 4; j++) { wood(); M.box(-W + .2, .6 + j * .62, 0, .4, .03, 7, { uvS: .7 }); let z = bz0; while (z < 3.4) { const w = R.range(.2, .5), h = R.range(.16, .42); const bc = R.pick([0x2a2430, 0xa08860, 0x5a1e2c, 0xd8cdb8, 0x1e3a4a, 0x8a7350]); const bd = R.range(.2, .34); plain(bc); M.box(-W + .05 + bd / 2, .615 + j * .62, z + w / 2, bd, h, w, {}); const fx0 = -W + .05 + bd; M.set({ kind: K.PLAIN, c: hex(mixC(bc, 0xffffff, .16)), em: 0, layer: 0 }); M.box(-W + .05 + bd / 2, .615 + j * .62 + h - .012, z + w / 2, bd + .004, .012, w + .004, {}); if (bc === 0xa08860 || bc === 0x8a7350) { M.set({ c: hex(0xd8c890) }); M.box(-W + .05 + bd / 2, .615 + j * .62 + h, z + w / 2, bd, .002, .05, {}); M.box(fx0 + .001, .615 + j * .62 + h * .45, z + w / 2, .002, h * .55, .05, {}); } if (R.chance(.7)) { paper(fx0 + .003, .615 + j * .62 + h * .46, z + w * .5, Math.min(.14, w * .7), .06, Math.PI / 2, R.chance(.5) ? 'shoeL' : 'tag'); } z += w + R.range(.02, .14); piece(); } }
      /* uprights so the shelves stand on something */
      for (const z of [-3.62, -1.82, -.02, 1.78, 3.5]) { wood(); M.box(-W + .22, .46, z, .42, 2.28, .05, { uvS: .7 }); wood(WALD); M.box(-W + .44, .46, z, .03, 2.28, .055, { uvS: .7 }); piece(); }
      wood(WALD); M.box(-W + .22, 2.74, 0, .44, .05, 7.3, { uvS: .7 });
      /* panels of wallpaper with a brass line above the shelves */
      const bx = -W + .02; for (let k = 0; k < 4; k++) { const zc = -2.7 + k * 1.8, zw = .8; M.set({ kind: K.BRASS, c: PAL.brass, em: 0, layer: 0 }); M.box(bx, 2.86, zc - zw, .014, .9, .014, {}); M.box(bx, 2.86, zc + zw, .014, .9, .014, {}); M.box(bx, 2.86, zc, .014, .014, 2 * zw, {}); M.box(bx, 3.76, zc, .014, .014, 2 * zw, {}); setPlain(M, k % 2 ? 0x3a1a26 : 0x42202a, L.HERRING); M.box(bx - .004, 2.87, zc, .006, .88, 2 * zw - .02, { uvS: 2 }); piece(); }
      /* framed things, a price sheet, a calendar */
      for (const [z, y, w0, h0, cl] of [[-3.05, 3.32, .46, .6, 'frame'], [-2.3, 3.3, .34, .44, CELL.posters[0]], [-1.05, 3.34, .48, .64, CELL.posters[1]], [-.35, 3.26, .3, .42, 'frame'], [1.25, 3.3, .5, .34, 'sale'], [2.3, 3.34, .42, .58, CELL.posters[2]], [3.05, 3.26, .3, .4, 'frame']]) { wood(WALD); M.box(bx + .012, y - h0 / 2 - .03, z, .026, h0 + .06, w0 + .06, { uvS: 3 }); paper(bx + .03, y, z, w0, h0, Math.PI / 2, cl); piece(); }
      /* wall lamp with a green shade, lit */
      for (const z of [.55, -1.75]) { M.set({ kind: K.BRASS, c: PAL.brass, em: 0, layer: 0 }); M.box(bx + .02, 3.4, z, .03, .18, .07, {}); M.beam([bx + .03, 3.46, z], [bx + .3, 3.58, z], .012, {}); plain(0x1e4a40); M.cyl(bx + .3, 3.46, z, .13, .05, .13, 12, { c: 0x1e4a40, top: false, bot: false }); M.set({ kind: K.PLAIN, c: hex(0xffe2b0), em: 255, layer: 0 }); M.blob(bx + .3, 3.47, z, .035, { sy: 1, r: R }); M.set({ em: 0 }); G(bx + .3, 3.42, z, [.62, .42, .2], 1.6); piece(); }
      /* pipe run along the wall top, brackets, a red valve, a drop to the floor */
      M.tube([[bx + .08, 3.86, -4.3], [bx + .08, 3.86, 0], [bx + .08, 3.86, 4.1]], .026, 3, 6, { c: 0x4a4038, id: 77 }); M.tube([[bx + .08, 3.86, 4.1], [bx + .08, 2, 4.12], [bx + .08, .05, 4.12]], .022, 3, 6, { c: 0x4a4038, id: 77 }); for (let z = -4; z < 4.2; z += .9) { plain(0x201c1a); M.box(bx + .04, 3.82, z, .1, .08, .03, {}); piece(); }
      plain(0x8a1c1c); M.lathe(bx + .16, 3.82, 2.7, [[.05, 0], [.06, .01], [.05, .02], [.0, .02]], 10, { c: 0xa8201c }); plain(0x2a2422); M.cyl(bx + .1, 3.72, 2.7, .012, .012, .1, 5, {}); piece();
    }
  });

  /* door: brass frame, its own glass. slides aside when the camera comes through */
  const DM = new MB(200); DM.at(SHOP.x, 0, SHOP.z, 0, () => { const ex = W - .02; DM.set({ kind: K.BRASS, c: PAL.brass, em: 0, layer: 0 }); DM.box(ex, .02, 1.6, .06, .06, 1.94, {}); DM.box(ex, 3.3, 1.6, .06, .06, 1.94, {}); DM.box(ex, .02, .66, .06, 3.34, .06, {}); DM.box(ex, .02, 2.54, .06, 3.34, .06, {}); DM.box(ex - .06, 1.2, .78, .03, .9, .03, {}); DM.box(ex - .06, 1.2, .78, .03, .03, .03, {}); });
  const GL = new MB(64); const glassQuad = (B, z0, z1, y0, y1) => { const x = SHOP.x + W; B.set({ kind: K.GLASS, c: [1, 1, 1], id: 0 }); const u0 = (z0 + D) / (2 * D), u1 = (z1 + D) / (2 * D), v0 = y0 / 4, v1 = y1 / 4; B.quad([x, y0, SHOP.z + z1], [x, y0, SHOP.z + z0], [x, y1, SHOP.z + z0], [x, y1, SHOP.z + z1], [u1, v0, u0, v1]); };
  glassQuad(GL, -D + .05, .6, .46, 3.4); glassQuad(GL, 2.6, D - .05, .46, 3.4); glassQuad(GL, -D + .05, D - .05, 3.4, 3.42);
  const DG = new MB(16); glassQuad(DG, .66, 2.54, .08, 3.3);
  /* light shafts from the street */
  FXM.set({ kind: 3, a: 18, c: [.5, .55, .9] }); const ox = SHOP.x, oz = SHOP.z;
  for (const [z0, z1] of [[-3.8, -2.6], [-2.4, -1.2], [-.9, .4], [2.8, 4]]) { const X = ox + W - .1, gd = [-1, -.55, -.1]; const a = [X, 3.2, oz + z0], b = [X, 3.2, oz + z1], c = [X + gd[0] * 5.6, 3.2 + gd[1] * 5.6, oz + z1 + gd[2] * 5.6], d = [X + gd[0] * 5.6, 3.2 + gd[1] * 5.6, oz + z0 + gd[2] * 5.6]; FXM.quad(a, b, c, d, [0, 0, 1, 1]); FXM.quad(b, a, d, c, [0, 0, 1, 1]); }
  /* the street's colours come in low: cyan on the north half, magenta on the south, up the north wall */
  { const X = v => ox + v, Z = v => oz + v, q = (x0, x1, z0, z1, y, a, c) => { FXM.set({ kind: 7, a, c }); FXM.quad([X(x0), y, Z(z1)], [X(x1), y, Z(z1)], [X(x1), y, Z(z0)], [X(x0), y, Z(z0)], [0, 0, 1, 1]); };
    q(-2.2, 6.6, -5.6, .6, .062, 128, [.04, .55, .78]); q(.2, 6.6, 1.2, 6, .063, 120, [.72, .06, .42]);
    FXM.set({ kind: 7, a: 96, c: [.03, .5, .72] }); FXM.quad([X(-2.2), .2, Z(-D + .04)], [X(5.6), .2, Z(-D + .04)], [X(5.6), 3.7, Z(-D + .04)], [X(-2.2), 3.7, Z(-D + .04)], [0, 0, 1, 1]);
    FXM.set({ kind: 7, a: 84, c: [.66, .05, .4] }); FXM.quad([X(5.6), .2, Z(D - .04)], [X(-1), .2, Z(D - .04)], [X(-1), 3.7, Z(D - .04)], [X(5.6), 3.7, Z(D - .04)], [0, 0, 1, 1]); }

  const w = (x, y, z) => [SHOP.x + x, y, SHOP.z + z];
  const lights = [
    [...w(.8, 3.72, .2), 0xffbf80, 9.2, .92],
    [...w(2.8, 3.2, -3.2), 0xffb070, 3.6, .7],
    [...w(1.4, 3.1, 4.1), 0xff3a90, 5.4, .62],
    [...w(2.5, 2.9, -3.9), PAL.red, 5.5, .62],
    [...w(4.8, 3.2, -3.9), PAL.cyan, 7.4, .92],
    [...w(-2.85, 1.42, -1.82), 0xffc070, 2.4, .62],
    [...w(.15, 1.3, -2.05), PAL.cyan, 2.5, .62],
    [...w(7, 2.2, 0), 0x4c9cff, 11.5, .66],
  ];
  const hot = [
    { key: 'clock', label: 'CLOCK IN', hotkey: 'E', line: 34, run: tapClock, p: w(-2.78, 1.5, -.82) },
    { key: 'shifts', label: 'SHIFTS', hotkey: 'R', line: 20, sheet: 'cShifts', p: w(-2.82, 1.08, -.38) },
    { key: 'pay', label: 'PAY', hotkey: 'F', line: 28, sheet: 'cPay', p: w(-2.82, 1.06, .02) },
  ];
  const door = new THREE.Vector3();
  return {
    geom: M.geom(), doorGeom: DM.geom(), glassGeom: GL.geom(), doorGlassGeom: DG.geom(), fxGeom: FXM.geom(), backGeom: shopBackdrop(), lights, hot, glows, pieces: PIECES, tris: M.n / 3,
    gobo: { rect: { x: SHOP.z - D, y: SHOP.z + D, z: .46, w: 3.4 }, x: SHOP.x + W, dir: new THREE.Vector3(1, .55, .1).normalize(), color: [.28, .2, .36] },
    setDoor(k) { const off = k * 1.86; if (room.door) room.door.position.z = off; if (room.doorGlass) room.doorGlass.position.z = off; if (room.door) room.door.updateMatrixWorld(true); if (room.doorGlass) room.doorGlass.updateMatrixWorld(true); },
  };
}

/* the street the shop's mirror sees past the glass */
function shopBackdrop() { const B = new MB(200), X = SHOP.x + SHOP.w / 2 + 4; for (const [z, y, w, h, c] of [[-3.6, 1.6, .22, 2.2, PAL.red], [-2.2, 3.1, 1.2, .14, PAL.cyan], [-.5, 1.4, .16, 1.9, 0xc09a30], [1.2, 2.5, .9, .16, 0xff2e88], [2.8, 1.2, .2, 2.4, PAL.orange], [4, 3, 1.1, .12, PAL.cyan]]) { B.set({ kind: K.PLAIN, em: 170, c: hex(c), layer: 0, id: 0 }); B.quad([X, y, SHOP.z + z + w], [X, y, SHOP.z + z - w], [X, y + h, SHOP.z + z - w], [X, y + h, SHOP.z + z + w]); B.quad([X, y + h, SHOP.z + z + w], [X, y + h, SHOP.z + z - w], [X, y, SHOP.z + z - w], [X, y, SHOP.z + z + w]); } return B.geom(); }

﻿/* ---------- the apartment: Plan ---------- */
/* In the +X side of the pale block, its glass in the block's real wall at x = -69. What the glass shows is another matter: see def.view. */
const APT = { x: -73.52, y: 52, z: 212, w: 9, d: 8, h: 4 };
/* its own small atlas: the shared one is full, and this one goes away with the room */
function apartmentAtlas() {
  const S = 1536, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'), C = {}, R = rng(4217);
  let cx = 0, cy = 0, rowH = 0;
  const cell = (name, w, h, fn) => { if (cx + w > S) { cx = 0; cy += rowH + 2; rowH = 0; } if (cy + h > S) console.error('apartment atlas overflow', name); const u0 = cx / S, u1 = (cx + w) / S, v1 = 1 - cy / S, v0 = 1 - (cy + h) / S; x.save(); x.beginPath(); x.rect(cx, cy, w, h); x.clip(); x.translate(cx, cy); fn(x, w, h); x.restore(); C[name] = [u0 + .0008, v0 + .0008, u1 - .0008, v1 - .0008]; cx += w + 2; rowH = Math.max(rowH, h); };
  const now = new Date(), CY = '#19e6e6', ICE = '#8fe8ff', ACID = '#f7e733', PINK = '#ff3c8e';
  /* today, on a pane of smoked glass: heavy, white, two lines already ticked */
  cell('note', 220, 440, (x, w, h) => { x.fillStyle = '#0b1018'; x.fillRect(0, 0, w, h); x.fillStyle = CY; x.fillRect(0, 0, w, 6); x.fillStyle = '#fff'; x.font = `800 50px ${FONT_DISP}`; x.textBaseline = 'middle'; x.fillText('TODAY', 16, 54); x.fillStyle = CY; x.fillRect(16, 86, 110, 5); for (let i = 0; i < 5; i++) { const y = 136 + i * 62; x.strokeStyle = i < 2 ? CY : '#fff'; x.lineWidth = 4; x.strokeRect(16, y - 16, 30, 30); x.fillStyle = i < 2 ? 'rgba(143,232,255,.5)' : '#e8eef4'; x.fillRect(60, y - 5, R.range(90, 140), 10); if (i < 2) { x.beginPath(); x.moveTo(21, y); x.lineTo(30, y + 10); x.lineTo(46, y - 14); x.stroke(); } } for (let y = 0; y < h; y += 5) { x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(0, y, w, 1); } });
  /* the month as a lit grid, today's square filled */
  cell('cal', 400, 320, (x, w, h) => { x.fillStyle = '#080c14'; x.fillRect(0, 0, w, h); x.fillStyle = ICE; x.textBaseline = 'middle'; x.font = `800 44px ${FONT_DISP}`; x.fillText(now.toLocaleString('en', { month: 'long' }).toUpperCase(), 14, 34); const first = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7, days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(), cw = (w - 20) / 7, ch = 42; x.font = `700 21px ${FONT_EN}`; x.textAlign = 'center'; for (let d = 1; d <= days; d++) { const k = d - 1 + first, X = 10 + k % 7 * cw, Y = 66 + Math.floor(k / 7) * ch; x.strokeStyle = 'rgba(143,232,255,.42)'; x.lineWidth = 2; x.strokeRect(X + 2, Y + 2, cw - 4, ch - 4); if (d === now.getDate()) { x.fillStyle = ACID; x.fillRect(X + 2, Y + 2, cw - 4, ch - 4); x.fillStyle = '#0a0a12'; } else x.fillStyle = k % 7 > 4 ? '#6fb4cc' : ICE; x.fillText(String(d), X + cw / 2, Y + ch / 2 + 1); } x.textAlign = 'left'; });
  /* the notebook is the one yellow thing on the table */
  cell('book', 220, 300, (x, w, h) => { x.fillStyle = ACID; x.fillRect(0, 0, w, h); x.fillStyle = '#0a0a12'; x.fillRect(0, 0, 26, h); x.font = `800 44px ${FONT_DISP}`; x.textBaseline = 'middle'; x.fillText('NOTES', 44, 70); x.fillRect(44, 102, 150, 6); x.fillStyle = '#f4f4ee'; x.fillRect(176, 0, 10, h); });
  /* the table's monitor: just a screen in use, a sidebar, a few windows of text, a graph ticking along */
  cell('phone', 420, 280, (x, w, h) => { x.fillStyle = '#070a12'; x.fillRect(0, 0, w, h); x.fillStyle = CY; x.fillRect(0, 0, w, 6); x.textBaseline = 'middle';
    x.fillStyle = 'rgba(143,232,255,.08)'; x.fillRect(0, 6, 62, h - 6); for (let i = 0; i < 5; i++) { x.fillStyle = i === 1 ? CY : 'rgba(143,232,255,.32)'; x.fillRect(16, 24 + i * 34, 30, 18); }
    const win = (X, Y, ww, hh, title, rows) => { x.strokeStyle = 'rgba(143,232,255,.45)'; x.lineWidth = 2; x.strokeRect(X, Y, ww, hh); x.fillStyle = 'rgba(143,232,255,.16)'; x.fillRect(X, Y, ww, 20); x.fillStyle = ICE; x.font = `700 13px ${FONT_EN}`; x.fillText(title, X + 8, Y + 11); for (let i = 0; i < rows.length; i++) { x.fillStyle = i === 0 ? 'rgba(237,230,214,.75)' : 'rgba(143,232,255,.4)'; x.fillRect(X + 10, Y + 32 + i * 15, (ww - 20) * rows[i], 6); } };
    win(76, 18, 196, 120, 'MAIL', [.7, .9, .55, .8, .4, .62]); win(284, 18, 122, 120, 'QUEUE', [.8, .5, .7, .35, .6, .45]);
    x.strokeStyle = 'rgba(143,232,255,.45)'; x.lineWidth = 2; x.strokeRect(76, 150, 330, 112); x.fillStyle = 'rgba(143,232,255,.16)'; x.fillRect(76, 150, 330, 20); x.fillStyle = ICE; x.font = `700 13px ${FONT_EN}`; x.fillText('LOAD', 84, 161);
    x.strokeStyle = CY; x.lineWidth = 2.5; x.beginPath(); for (let i = 0; i <= 30; i++) { const X = 88 + i * 10.4, Y = 232 - (Math.sin(i * .55) * .5 + Math.sin(i * 1.7 + 1) * .25 + .9) * 26; i ? x.lineTo(X, Y) : x.moveTo(X, Y); } x.stroke();
    x.fillStyle = PINK; x.fillRect(374, 158, 22, 6); x.fillStyle = 'rgba(0,0,0,.16)'; for (let y = 0; y < h; y += 5) x.fillRect(0, y, w, 1); });
  cell('label', 240, 110, (x, w, h) => { x.fillStyle = '#0c0d14'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffb35c'; x.textBaseline = 'middle'; x.font = `800 42px ${FONT_DISP}`; x.fillText('CAREER', 14, 36); x.fillStyle = PINK; x.font = `800 22px ${FONT_DISP}`; x.fillText('PAUSED', 14, 82); x.strokeStyle = PINK; x.lineWidth = 2; x.strokeRect(8, 66, 112, 32); });
  cell('carton', 150, 170, (x, w, h) => { x.fillStyle = '#e8e8f0'; x.fillRect(0, 0, w, h); x.fillStyle = PINK; x.fillRect(0, 0, w, 44); x.fillStyle = '#fff'; x.font = `800 30px ${FONT_DISP}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('NUDLO', w / 2, 24); x.fillStyle = '#0a0a12'; x.font = `800 60px ${FONT_DISP}`; x.fillText('N', w / 2, 106); x.textAlign = 'left'; });
  cell('can', 96, 120, (x, w, h) => { x.fillStyle = '#10121c'; x.fillRect(0, 0, w, h); x.fillStyle = CY; x.fillRect(0, 34, w, 40); x.fillStyle = '#10121c'; x.font = `800 26px ${FONT_EN}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ZOXA', w / 2, 55); x.textAlign = 'left'; });
  /* the media wall, on low */
  cell('holo', 280, 158, (x, w, h) => { x.fillStyle = '#04121c'; x.fillRect(0, 0, w, h); x.fillStyle = '#39d8ff'; x.font = `700 20px ${FONT_EN}`; x.textBaseline = 'middle'; x.fillText('CH.04 ▸ WEATHER', 12, 20); x.strokeStyle = '#39d8ff'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= 26; i++) { const X = 12 + i * 10, Y = 96 + Math.sin(i * .7) * 22 + Math.sin(i * 1.9) * 8; if (i) x.lineTo(X, Y); else x.moveTo(X, Y); } x.stroke(); x.fillStyle = '#ff2e88'; x.fillRect(12, 136, 96, 6); x.fillStyle = 'rgba(57,216,255,.5)'; x.fillRect(118, 136, 150, 6); x.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < h; y += 4) x.fillRect(0, y, w, 1); });
  /* his skis: graphite with a yellow line */
  cell('ski', 48, 400, (x, w, h) => { x.fillStyle = '#23242e'; x.fillRect(0, 0, w, h); x.fillStyle = ACID; x.fillRect(w / 2 - 3, 0, 6, h); x.fillStyle = '#0a0a12'; x.fillRect(0, h * .42, w, 56); x.fillStyle = ACID; x.font = `800 20px ${FONT_DISP}`; x.save(); x.translate(w / 2, h * .42 + 28); x.rotate(-Math.PI / 2); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('N/F', 0, 0); x.restore(); });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = 8; tex.flipY = true; tex.premultiplyAlpha = false;
  return { tex, C };
}

/* spot: where she is, by the clock unless a repaint around her keeps the one she's in */
function buildApartment(spot = figSpot()) {
  const A = APT, W = A.w / 2, D = A.d / 2, H = A.h;
  const { tex, C } = apartmentAtlas();
  /* solids in M; everything he could tidy away in Z, with its own numbers, so turning it off changes nothing else */
  const M = new MB(28000), Z = new MB(16000), FXM = new MB(1600), GL = new MB(16), R = rng(4210), Q = rng(5310);
  const glows = [], zGlows = [], w = (x, y, z) => [A.x + x, A.y + y, A.z + z];
  const G = (x, y, z, c, s, a = 0, list = glows) => { const k = typeof c === 'number' ? hex(c) : c; list.push({ x: A.x + x, y: A.y + y, z: A.z + z, r: k[0], g: k[1], b: k[2], s, a }); };
  const piece = () => PIECES++;
  const plate = (B, x, y, z, pw, ph, ry, cell, rx = 0, o = {}) => B.at(x, y, z, ry, () => B.plate(0, 0, 0, pw, ph, 0, C[cell], { kind: K.PAPER, em: 0, c: [1, 1, 1], ...o }), rx);
  const chrome = (B = M, c = 0xa8b4c8) => B.set({ kind: K.BRASS, em: 0, layer: 0, c });
  /* a lit line that keeps its colour: neon whitens when it faces you */
  const line = (B, x, y, z, lw, lh, ld, c, em = 200) => { setPlain(B, c, 0, em); B.box(x, y, z, lw, lh, ld, { c }); B.set({ em: 0 }); };
  /* anything soft: a duvet, pillows. A rounded lump with one smooth skin, x and z centred, y is the base */
  const soft = (B, x, y, z, sw, sh, sd, c, r, o = {}) => {
    const nr = o.rows || 6, nn = o.seg || 14, j = o.j === undefined ? .05 : o.j, ry = o.ry || 0, J = Array.from({ length: nn }, () => 1 + (r() - .5) * j * 2), rings = [];
    for (let i = 0; i <= nr; i++) { const t = i / nr, k = Math.max(.002, Math.pow(Math.sin(t * Math.PI), .42)), yy = y + sh * t, ring = []; for (let n = 0; n < nn; n++) { const a = -n / nn * TAU, ca = Math.cos(a), sa = Math.sin(a), e = .6, px = Math.sign(ca) * Math.pow(Math.abs(ca), e) * sw / 2 * k * J[n], pz = Math.sign(sa) * Math.pow(Math.abs(sa), e) * sd / 2 * k * J[n]; ring.push([x + px * Math.cos(ry) + pz * Math.sin(ry), yy + (o.sag || 0) * (px * px + pz * pz), z - px * Math.sin(ry) + pz * Math.cos(ry)]); } rings.push(ring); }
    setPlain(B, c, o.layer || 0); B.loft(rings, { smooth: true, c, grad: o.grad || .72, uvS: o.uvS || 1 });
  };
  /* hard-edged upholstery: a slab with soft corners */
  const pad = (B, x, y, z, pw, ph, pd, c = PALE) => { setPlain(B, c, L.LEATHER); B.extrude(roundPoly(x, z, pw, pd, .05, 2), y, y + ph, { grad: .86, uvS: 3, id: B.nid() }); };
  const SHELL = 0x1b1b2a, CEIL = 0x14131e, FLOOR = 0x0b0c14, BLK = 0x101018, JET = 0x07070c, PALE = 0x5e5c6c, GUN = 0x3c404e, CY = 0x19e6e6, ICE = 0x8fe8ff, VIO = 0xb13cff, AMB = 0xffb35c;
  /* the glass runs wall to wall and floor to ceiling on the +X side; he rests at E */
  const wz0 = -D + .01, wz1 = D - .01, wy0 = .05, wy1 = H - .12, GX = W, E = [-3.2, 1.62, 0];
  /* the low table, and what stands on it */
  const tx = 1.05, tz = .02, top = .46;

  M.at(A.x, A.y, A.z, 0, () => {
    /* floor: seamless black resin. What sells it is what lies on it, below */
    setPlain(M, FLOOR); M.id = 11; M.quad([-W, .05, D], [W, .05, D], [W, .05, -D], [-W, .05, -D], [0, 0, 1, 1], .75, 1, 1, .75);
    /* ceiling: flat and dark, three recessed slots running at the view */
    setPlain(M, CEIL); M.id = 14; M.quad([-W, H, -D], [W, H, -D], [W, H, D], [-W, H, D], [0, 0, 1, 1]);
    for (const [z, c] of [[-1.6, CY], [.2, ICE], [2.0, CY]]) { setPlain(M, 0x06060c); M.box(.2, H - .006, z, A.w - .8, .006, .09, { id: 14 }); neonStrip(M, .2, H - .014, z, A.w - .8, .008, .05, c, 0); }

    /* walls: matte composite panels, each its own number so the ink draws the gaps */
    const pane = (x0, x1, id) => { setPlain(M, SHELL); M.id = id; M.quad([x0, 0, 0], [x1, 0, 0], [x1, H, 0], [x0, H, 0], [0, 0, 1, 1], .8, .8, 1, 1); };
    for (const v of [{ x: 0, z: -D, ry: 0, len: A.w }, { x: 0, z: D, ry: Math.PI, len: A.w }, { x: -W, z: 0, ry: Math.PI / 2, len: A.d }]) M.at(v.x, 0, v.z, v.ry, () => {
      const n = Math.round(v.len / 1.3), s = v.len / n; for (let i = 0; i < n; i++) pane(-v.len / 2 + i * s, -v.len / 2 + (i + 1) * s, M.nid());
      setPlain(M, JET); M.box(0, .05, .012, v.len, .07, .024, {});
    });
    line(M, -1.9, .05, D - .004, .006, H - .1, .006, ICE, 120); line(M, -1.9, .05, -D + .004, .006, H - .1, .006, ICE, 120);

    /* the glass line: a raised step, its lit lip, black head and jambs, three thin mullions */
    setPlain(M, 0x12121b); M.box(W - .175, .05, 0, .35, .12, A.d, { id: 12 });
    line(M, W - .352, .163, 0, .006, .006, A.d, VIO, 170);
    setPlain(M, JET); M.box(W - .04, wy1, 0, .08, H - wy1, A.d, {}); for (const z of [wz0, wz1]) M.box(W - .04, .05, z, .08, wy1 - .05, .05, {}); for (const z of [-2.1, 0, 2.1]) M.box(W - .035, .17, z, .07, wy1 - .17, .03, {}); piece();

    /* kitchen: one black run on the -Z wall, a steel top, a floating slab with cold light under it, no handles anywhere */
    setPlain(M, BLK); M.box(.2, .05, -D + .3, 4.4, .85, .6, { id: M.nid() });
    setPlain(M, GUN); M.box(.2, .9, -D + .32, 4.4, .04, .64, { id: M.nid() }); line(M, .2, .905, -D + .642, 4.4, .012, .004, 0xc8d4e8, 150);
    setPlain(M, 0x08080c); M.box(1.2, .94, -D + .3, .7, .004, .5, {});
    chrome(M, 0x6f7787); M.tube([[-.8, .94, -D + .07], [-.8, 1.22, -D + .07], [-.8, 1.3, -D + .17], [-.8, 1.22, -D + .28]], .012, 12, 6, { c: 0x6f7787 });
    setPlain(M, BLK); M.box(.6, 1.7, -D + .16, 3.2, .3, .32, { id: M.nid() }); neonStrip(M, .6, 1.685, -D + .26, 3.1, .012, .03, 0xcfefff, 0);
    /* today's plinth: a slim black block, lit at the foot */
    setPlain(M, BLK); M.box(1.1, .05, -1.2, .3, .9, .7, { id: M.nid() }); line(M, .948, .06, -1.2, .004, .012, .7, ICE, 120);
    /* TODAY: a pane of smoked glass standing on it */
    { const x = 1.05, z = -1.2; setPlain(M, 0x0b1018); M.box(x + .025, .95, z, .03, 1.2, .64, { id: 210 });
      plate(M, x, 1.56, z, .6, 1.17, -Math.PI / 2, 'note', 0, { kind: K.SIGN, em: 130, c: [1, 1, 1], seed: 0, id: 210 });
      line(M, x - .002, 2.15, z, .012, .012, .64, CY, 220); for (const dz of [-.32, .32]) line(M, x - .002, .95, z + dz, .012, 1.21, .012, CY, 220); piece(); }

    /* the low table: a black slab cantilevered off one block, its near edge the only warm line in the room */
    setPlain(M, 0x15151f); M.extrude(roundPoly(tx, tz, 1.1, 1.3, .06, 2), .41, top, { grad: .9, id: 213 });
    setPlain(M, 0x0c0c14); M.box(tx + .2, .05, tz + .3, .4, .36, .4, { id: 213 });
    line(M, tx - .555, .435, tz, .004, .008, 1.3, AMB, 200); piece();
    /* DECIDE: a slim monitor on a chrome stand, lit along the top like TODAY */
    { const x = tx - .25, z = tz - .3, y = .84; setPlain(M, 0x08090c); M.box(x + .06, top, z, .16, .015, .22, { id: 211 }); chrome(M, GUN); M.tube([[x + .06, top + .01, z], [x + .06, y - .2, z]], .014, 12, 5, { c: GUN });
      setPlain(M, 0x0b1018); M.box(x + .025, y - .22, z, .03, .44, .64, { id: 211 }); plate(M, x, y, z, .6, .4, -Math.PI / 2, 'phone', 0, { kind: K.SIGN, em: 200, c: [1, 1, 1], seed: 0, id: 211 });
      line(M, x - .002, y + .22, z, .012, .012, .64, CY, 220); G(x - .05, y, z, [.3, .18, .3], .6); piece(); }
    /* NOTES: the yellow notebook, tipped up on a wedge */
    { const x = tx - .25, z = tz + .32; setPlain(M, 0x0a0a12); M.box(x + .05, top, z, .2, .06, .3, { id: 212 });
      M.at(x, .6, z, -Math.PI / 2, () => { setPlain(M, 0xe8e8f0); M.box(0, -.045, 0, .3, .045, .38, { id: 212 }); M.at(0, .001, 0, 0, () => M.plate(0, 0, 0, .3, .38, 0, C.book, { kind: K.SIGN, em: 190, c: [1, 1, 1], id: 212, seed: 0 }), -Math.PI / 2); }, .75); piece(); }

    /* a chrome sled chair by the glass, its back to the room */
    { const cx = 3.7, cz = -2.6; pad(M, cx, .3, cz, .62, .12, .6); pad(M, cx - .26, .38, cz, .12, .38, .6); chrome(M, GUN); for (const dz of [-.3, .3]) M.tube([[cx + .28, .06, cz + dz], [cx - .32, .06, cz + dz], [cx - .36, .4, cz + dz], [cx - .32, .76, cz + dz]], .012, 12, 5, { c: GUN }); piece(); }

    /* CAREER: a steel drawer tower beside the lounge, one drawer left open */
    { const x0 = 1.85, x1 = 2.35, zc = 1.35; setPlain(M, 0x3c4150); M.box((x0 + x1) / 2, .05, zc, x1 - x0, 1.1, .44, { id: M.nid() }); line(M, x0 - .002, .05, zc - .22, .004, 1.1, .012, 0xdde6f5, 160);
      for (let i = 0; i < 3; i++) { const y = .1 + i * .34, id = M.nid(); setPlain(M, i === 1 ? 0x4a5062 : 0x343946); if (i === 1) M.box(x0 - .14, y, zc, .26, .3, .4, { id }); else M.box(x0 - .006, y, zc, .012, .3, .4, { id }); line(M, i === 1 ? x0 - .272 : x0 - .014, y + .22, zc, .006, .03, .13, AMB, 190); }
      for (const [i, c] of [[0, CY], [1, 0xf7e733], [2, 0xff3c8e]]) line(M, x0 - .21 + i * .055, .54, zc - .09 + i * .09, .03, .05, .11, c, 180);
      plate(M, x0 - .004, .98, zc, .38, .16, -Math.PI / 2, 'label', 0, { kind: K.SIGN, em: 130, c: [1, 1, 1], seed: 0 }); piece(); }

    /* the bed, up on its own lit platform by the glass, its head against the south wall */
    { const px0 = 2.2, px1 = W - .35, pz0 = 1.2, pz1 = D, bx = 3.35, bz = 2.85;
      setPlain(M, 0x15151f); M.box((px0 + px1) / 2, .05, (pz0 + pz1) / 2, px1 - px0, .22, pz1 - pz0, { id: M.nid() }); line(M, px0 - .002, .2, (pz0 + pz1) / 2, .006, .012, pz1 - pz0, VIO, 190); line(M, (px0 + px1) / 2, .2, pz0 - .002, px1 - px0, .012, .006, VIO, 190);
      setPlain(M, BLK); M.box(bx, .27, bz, 1.9, .14, 2.2, { id: M.nid() });
      soft(M, bx, .4, bz - .05, 1.86, .2, 2.1, 0x34344a, R, { j: .02, seg: 22, rows: 5 }); soft(M, bx, .52, bz - .62, 1.84, .1, .7, 0x6a6884, R, { j: .07, seg: 16, rows: 4 }); for (const dx of [-.45, .45]) soft(M, bx + dx, .56, D - .3, .72, .18, .34, 0xb4b2c8, R, { j: .04, seg: 14 });
      setPlain(M, 0x1a1a26, L.LEATHER); M.box(bx, .27, D - .06, 2.3, 1.1, .1, { id: M.nid() }); line(M, bx, 1.38, D - .12, 2.3, .01, .01, ICE, 160); piece(); }

    /* the long pale sofa against the south wall, on a lit kick */
    { setPlain(M, BLK); M.box(-1.1, .05, 3.35, 3, .08, .9, { id: M.nid() }); line(M, -1.1, .055, 2.898, 3, .012, .004, ICE, 120); for (let i = 0; i < 3; i++) pad(M, -2.1 + i * 1, .13, 3.3, .98, .22, .86); for (let i = 0; i < 3; i++) pad(M, -2.1 + i * 1, .35, 3.7, .98, .38, .2); piece(); }

    /* the door, flush, by the back corner */
    setPlain(M, 0x15151e); M.box(-3.5, .05, D - .03, 1.1, 2.5, .06, {}); setPlain(M, CEIL); M.box(-3.5, .06, D - .06, .96, 2.42, .03, {}); chrome(M, 0x6f7787); M.box(-3.1, .9, D - .08, .012, .7, .012, { c: 0x6f7787 }); piece();
    /* the media wall's dark back */
    setPlain(M, 0x0e0e16); M.box(-3.1, .55, -D + .015, 2.4, 1.8, .012, { id: M.nid() });
    /* WEEK: a lit grid hung from the ceiling in front of the glass, over the foot of the bed */
    { const x = W - .5, y = 2.45, z = 1.7; setPlain(M, 0x080c14); M.box(x + .045, y - .55, z, .06, 1.1, 1.36, { id: 214 }); plate(M, x, y, z, 1.3, 1.04, -Math.PI / 2, 'cal', 0, { kind: K.SIGN, em: 130, c: [1, 1, 1], seed: 0, id: 214 }); line(M, x - .004, y + .53, z, .012, .012, 1.34, ICE, 200); chrome(M, 0x6f7787); for (const dz of [-.5, .5]) M.box(x + .03, y + .55, z + dz, .012, H - y - .55, .012, { c: 0x6f7787 }); piece(); }
  });

  /* the glass: what it shows comes from def.view */
  { const x = A.x + W, q = (z0, z1, y0, y1) => { GL.set({ kind: K.GLASS, c: [1, 1, 1], id: 0 }); const u0 = (z0 + D) / (2 * D), u1 = (z1 + D) / (2 * D), v0 = y0 / 4, v1 = y1 / 4; GL.quad([x, A.y + y0, A.z + z1], [x, A.y + y0, A.z + z0], [x, A.y + y1, A.z + z0], [x, A.y + y1, A.z + z1], [u1, v0, u0, v1]); }; q(wz0, wz1, wy0, wy1); }

  /* the city lying on the floor. Wedges fan out from where he rests, so they read as reflections and not as rectangles */
  { const X = v => A.x + v, Z2 = v => A.z + v, Y = A.y, Zf = (zw, x) => E[2] + (zw - E[2]) * (x - E[0]) / (GX - E[0]);
    const wedge = (zw0, zw1, c, a, y = .06, xa = GX - .36, xb = -1.7) => { FXM.set({ kind: 3, a, c }); FXM.quad([X(xa), Y + y, Z2(Zf(zw1, xa))], [X(xa), Y + y, Z2(Zf(zw0, xa))], [X(xb), Y + y, Z2(Zf(zw0, xb))], [X(xb), Y + y, Z2(Zf(zw1, xb))], [0, 0, 1, 1]); };
    const bands = [[-D, -1.7, [.88, .14, .5], 150], [-1.6, -.15, [1, .48, .24], 120], [-.15, 1.3, [.62, .16, .72], 140], [1.4, D, [.22, .62, 1], 130]];
    for (const [a, b, c, s] of bands) wedge(a, b, c, s * .32);
    /* the towers and their signs, smeared down the resin: thin, uneven, in the colour of that part of the skyline */
    for (let i = 0; i < 52; i++) { const z = Q.range(-D + .05, D - .2), ww = Q.range(.03, .24), zone = z < -1.7 ? [[.95, .16, .55], [.72, .1, .6]] : z < -.15 ? [[1, .5, .24], [.95, .2, .5]] : z < 1.3 ? [[.66, .18, .8], [.95, .2, .55]] : [[.2, .6, 1], [.45, .88, 1]]; wedge(z, z + ww, zone[i % 2], Q.range(30, 100), .0605 + i * .00002, GX - .36, Q.range(-2.4, .4)); }
    for (let i = 0; i < 6; i++) { const z = Q.range(-3.6, 3.6); wedge(z, z + .04, i < 5 ? [.55, .9, 1] : [.97, .9, .2], 150, .0612, GX - .36, Q.range(-1.6, .8)); }
    /* the same bands, fainter, on the ceiling */
    for (const [a, b, c, s] of bands) { const xa = GX - .1, xb = .7; FXM.set({ kind: 3, a: s / 4, c }); FXM.quad([X(xb), Y + H - .02, Z2(Zf(b, xb))], [X(xb), Y + H - .02, Z2(Zf(a, xb))], [X(xa), Y + H - .02, Z2(Zf(a, xa))], [X(xa), Y + H - .02, Z2(Zf(b, xa))], [0, 1, 1, 0]); }
    /* a lift of pink in the bottom of the glass */
    FXM.set({ kind: 3, a: 46, c: [.88, .14, .5] }); FXM.quad([X(GX - .03), Y + .06, Z2(wz1)], [X(GX - .03), Y + .06, Z2(wz0)], [X(GX - .03), Y + 1.4, Z2(wz0)], [X(GX - .03), Y + 1.4, Z2(wz1)], [0, 0, 1, 1]);
    const blob = (x, y, z, sx, sz, c, a) => { FXM.set({ kind: 7, a, c }); FXM.quad([X(x - sx / 2), Y + y, Z2(z + sz / 2)], [X(x + sx / 2), Y + y, Z2(z + sz / 2)], [X(x + sx / 2), Y + y, Z2(z - sz / 2)], [X(x - sx / 2), Y + y, Z2(z - sz / 2)], [0, 0, 1, 1]); };
    blob(tx, .058, tz, 2, 1.8, [1, .6, .25], 46); blob(tx, top + .003, tz, 1.1, 1.3, [.75, .2, .6], 34); blob(3.35, .28, 2.6, 2.6, 2.8, [.5, .15, .9], 60); blob(1.1, .058, -1.2, .8, 1, [.3, .7, 1], 40);
    /* one flare, off the middle slot where it meets the glass; and magenta behind the A or B */
    FXM.set({ kind: 7, a: 80, c: [.6, .95, 1] }); FXM.quad([X(GX - .09), Y + wy1 - .05, Z2(.2 + 1.2)], [X(GX - .09), Y + wy1 - .05, Z2(.2 - 1.2)], [X(GX - .09), Y + wy1, Z2(.2 - 1.2)], [X(GX - .09), Y + wy1, Z2(.2 + 1.2)], [0, 0, 1, 1]);
    { const x = tx - .2, z = tz - .3; FXM.set({ kind: 7, a: 50, c: [.9, .25, .5] }); FXM.quad([X(x), Y + .5, Z2(z + .44)], [X(x), Y + .5, Z2(z - .44)], [X(x), Y + 1.18, Z2(z - .44)], [X(x), Y + 1.18, Z2(z + .44)], [0, 0, 1, 1]); }
  }
  const fxBase = FXM.n;
  /* on the glass behind where she stands in the evening: the glow that keeps her off the buildings, gone with her when the room is tidied */
  if (spot === 'eve') { const X = v => A.x + v, Y = A.y, Z2 = v => A.z + v; FXM.set({ kind: 7, a: 110, c: [1, .24, .56] }); FXM.quad([X(GX - .03), Y - .5, Z2(.55 + .8)], [X(GX - .03), Y - .5, Z2(.55 - .8)], [X(GX - .03), Y + 2.4, Z2(.55 - .8)], [X(GX - .03), Y + 2.4, Z2(.55 + .8)], [0, 0, 1, 1]); }

  /* ---------- clutter: the second pass. His things, kept near the walls and clear of the five that matter ---------- */
  Z.at(A.x, A.y, A.z, 0, () => {
    const pl = (c, l = 0) => setPlain(Z, c, l);
    /* takeaway on the counter, cans, his shaker */
    pl(0xe8e8f0); Z.rbox(.4, .94, -D + .32, .12, .15, .12, .2, {}); plate(Z, .412, 1.015, -D + .381, .12, .15, .2, 'carton', 0, { id: M.nid() }); piece();
    for (const [x, z] of [[.62, -D + .22], [.72, -D + .34], [.8, -D + .2]]) { Z.set({ kind: K.PLAIN, c: hex(0x10121c), layer: 0 }); Z.cyl(x, .94, z, .034, .034, .118, 12, { c: 0x10121c, topc: 0xb8bcc0 }); plate(Z, x, 1.0, z + .0345, .05, .08, 0, 'can', 0, { id: M.nid() }); piece(); }
    Z.set({ kind: K.PLAIN, c: hex(0x1c2028), layer: 0 }); Z.lathe(-.3, .94, -D + .3, [[.04, 0], [.046, .01], [.046, .03], [.05, .035], [.05, .16], [.042, .175], [0, .18]], 14, { c: 0x1c2028, grad: .9 }); Z.set({ kind: K.PLAIN, c: hex(0xf7e733), layer: 0, em: 40 }); Z.cyl(-.3, 1.03, -D + .3, .0505, .0505, .018, 14, { c: 0xf7e733, top: false }); Z.set({ em: 0 }); piece();
    /* a lit niche of bottles on the back wall: the one extravagance */
    { const x0 = -2.9, x1 = -1.5, y0 = 1.2, y1 = 2.6; pl(0x08080e); Z.box((x0 + x1) / 2, y0, -D + .04, x1 - x0, y1 - y0, .08, {}); line(Z, (x0 + x1) / 2, y1 - .03, -D + .1, x1 - x0 - .04, .01, .04, 0xffb35c, 200); for (const y of [y0 + .45, y0 + .9]) { pl(GUN); Z.box((x0 + x1) / 2, y, -D + .14, x1 - x0, .02, .2, {}); }
      for (let i = 0; i < 12; i++) { const s = i % 3, c = [0x8a4e1a, 0x3a6a5a, 0x5a1e2c, 0xc8c0a8][i % 4], x = x0 + .12 + (i % 6) * .22, y = y0 + .02 + Math.floor(i / 6) * .45 + (i >= 6 ? .02 : 0); Z.set({ kind: K.PLAIN, c: hex(c), layer: 0, em: 30 }); Z.lathe(x, y, -D + .15, [[.04, 0], [.045, .02], [.045, .2 + s * .03], [.016, .26 + s * .03], [.014, .32 + s * .03], [0, .33 + s * .03]], 10, { c }); Z.set({ em: 0 }); piece(); } piece(); }
    /* the jacket thrown on the sofa, boots kicked off in front of it */
    soft(Z, -1.6, .38, 3.25, .6, .1, .5, 0x24263a, Q, { j: .1, seg: 14, rows: 4, ry: .5 }); piece();
    for (const [x, z, a] of [[-1.3, 2.5, .5], [-1.1, 2.38, -.3]]) Z.at(x, .05, z, a, () => { pl(0x10101a); Z.box(0, 0, 0, .1, .07, .26, {}); Z.box(0, .07, -.07, .09, .24, .11, {}); piece(); });
    /* the charger's lead, off the table across the floor; the vacuum on its rounds */
    Z.tube([[tx - .2, .47, tz + .6], [tx - .5, .44, tz + .7], [tx - .62, .07, tz + .76], [-1, .056, .6], [-2.4, .056, .3], [-W + .06, .056, .2]], .0035, 18, 3, { c: 0xdedad0 }); piece();
    Z.set({ kind: K.PLAIN, c: hex(0x14141c), layer: 0 }); Z.cyl(-1.4, .05, -.4, .17, .17, .05, 18, { c: 0x14141c, topc: 0x1e1e28 }); line(Z, -1.36, .1, -.4, .03, .004, .01, CY, 220); piece();
    /* a hard case left open on the floor, chrome on a towel: a new arm, not fitted yet */
    { const x = -2.6, z = -1.4; pl(0x1c1d28); Z.box(x, .05, z, .6, .1, .42, {}); chrome(Z, 0x6f7787); Z.box(x, .15, z - .206, .6, .34, .012, { c: 0x6f7787 }); pl(0x5a5e70); Z.box(x, .15, z, .56, .006, .38, {}); chrome(Z); Z.tube([[x - .2, .17, z + .06], [x, .175, z - .02], [x + .18, .17, z + .06]], .03, 12, 6, { c: 0xa8b4c8 }); Z.blob(x + .24, .18, z + .08, .04, { c: 0xa8b4c8, sy: .7, r: Q }); piece(); piece(); }
    /* the console and the screen on low; a thin slot of light under it */
    { pl(BLK); Z.box(-3.1, .05, -D + .17, 2.3, .28, .3, {}); line(Z, -3.1, .055, -D + .321, 2.3, .012, .004, ICE, 120); plate(Z, -3.1, 1.45, -D + .03, 1.9, 1.07, 0, 'holo', 0, { kind: K.SIGN, em: 70, c: [.62, .82, 1], seed: 0 }); G(-3.1, 1.45, -D + .1, [.08, .34, .46], 1.4, 1, zGlows); piece(); piece(); }
    /* the skis by the door, the old stick under the bed */
    Z.at(-2.7, .05, D - .1, 0, () => { for (const dz of [0, .1]) Z.at(dz * 1.6, 0, 0, 0, () => { Z.at(0, .84, 0, 0, () => { pl(0x1a1a20); Z.box(0, -.84, 0, .1, 1.72, .012, {}); Z.plate(0, 0, -.0068, .092, 1.68, Math.PI, C.ski, { kind: K.PAPER, em: 0, c: [1, 1, 1], id: 220 + (dz ? 1 : 0) }); }, -.05); }); }); piece(); piece();
    { const a = [3.0, .3, 2.4], b = [2.5, .29, 1.5]; pl(0x3a3a40); Z.beam(a, b, .016, {}); piece(); }
    /* on the bed: a tablet left face down, a glass on the platform */
    pl(0x14141c); Z.rbox(3.0, .6, 2.2, .2, .012, .28, .4, {}); piece(); Z.set({ kind: K.PLAIN, c: hex(0xc8d4dc), layer: 0 }); Z.lathe(2.35, .27, 1.4, [[.034, 0], [.038, .08], [.032, .08], [0, .01]], 10, { c: 0xc8d4dc }); piece();
  });

  const lights = [
    [...w(.5, H - .3, 0), 0x7fddee, 9, .42],
    [...w(W + 1.3, 1.2, -2), 0xff3c8e, 12, .9],
    [...w(W + 1.3, 2.4, 2.2), 0x38b6ff, 12, .75],
    [...w(3.2, .5, 2.2), 0xb13cff, 3.2, .55],
    [...w(.6, 1.9, -D + .6), 0xcfefff, 3.6, .45],
    [...w(tx + .2, .5, tz + .6), 0xffb35c, 2.4, .55],
    [...w(-3.1, 1.5, -D + .8), 0x8fe8ff, 3, .3],
    [...w(-2, 2.4, 0), 0x6a5cf0, 7.5, .2],
  ];
  const hot = [
    { key: 'today', label: 'TODAY', hotkey: 'E', line: 16, sheet: 'cToday', p: w(1.05, 2.16, -1.2) },
    { key: 'week', label: 'WEEK', hotkey: 'R', line: 14, sheet: 'cWeek', p: w(W - .5, 2.98, 1.7) },
    { key: 'notes', label: 'NOTES', hotkey: 'F', line: 26, sheet: 'cNotes', p: w(tx - .25, .76, tz + .32) },
    { key: 'decide', label: 'DECIDE', hotkey: 'G', line: 14, sheet: 'cDecide', p: w(tx - .25, 1.15, tz - .3) },
    { key: 'career', label: 'CAREER', hotkey: 'T', line: 20, sheet: 'cCareer', p: w(1.85, 1.15, 1.35) },
  ];
  return {
    geom: M.geom(), clutterGeom: Z.geom(), glassGeom: GL.geom(), fxGeom: FXM.geom(), lights, hot, glows: [...glows, ...zGlows], glowsPlain: glows, clutterLight: 6, fxPlain: fxBase, pieces: PIECES, tris: M.n / 3, clutterTris: Z.n / 3, atlas: tex, day: new Date().toDateString(), spot,
    setDoor() {},
  };
}

/* ---------- the gym: a pale-concrete warehouse bay at the back of the northside gym, in through its side roll-up door ---------- */
/* Its +X wall is the building's real east wall (x = GYM.x + 31); the door is a hole in the city's depth, like the apartment's glass. */
const GR = { x: GYM.x + 25, y: 0, z: GYM.z, w: 12, d: 10, h: 5 };
/* the roll-up door: half its width (z) and its height */
const GDOOR = { dz: 1.9, h: 3.4 };
/* the app escapes his text for the HUD's markup; the canvas wants it plain */
const unesc = s => String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
/* what the whiteboard and the chart show, so they're only repainted when it changes */
const gymSig = T => JSON.stringify([T.s, T.ex.map(e => e.done), T.week.map(d => d.s + (d.done ? 1 : 0))]);
let GYM_SIG = '';
/* its own atlas. The whiteboard (today's session) and the split chart (this week) are painted from his data */
function gymAtlas(T) {
  const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'), C = {}, cells = {};
  let cx = 0, cy = 0, rowH = 0;
  const cell = (name, w, h, fn) => { if (cx + w > S) { cx = 0; cy += rowH + 2; rowH = 0; } if (cy + h > S) console.error('gym atlas overflow', name); cells[name] = { px: cx, py: cy, w, h, fn }; C[name] = [cx / S + .0008, 1 - (cy + h) / S + .0008, (cx + w) / S - .0008, 1 - cy / S - .0008]; cx += w + 2; rowH = Math.max(rowH, h); };
  const draw = (name, t) => { const c = cells[name]; x.save(); x.beginPath(); x.rect(c.px, c.py, c.w, c.h); x.clip(); x.translate(c.px, c.py); x.clearRect(0, 0, c.w, c.h); c.fn(x, c.w, c.h, t); x.restore(); };
  const neon = (x, txt, X, Y, font, col, core = '#fff4e0', lw = 5, blur = 16) => { x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.shadowColor = col; x.shadowBlur = blur; x.strokeStyle = col; x.lineWidth = lw; x.strokeText(txt, X, Y); x.shadowBlur = blur * .6; x.fillStyle = core; x.fillText(txt, X, Y); x.shadowBlur = 0; x.textAlign = 'left'; };
  const fit = (x, s, max) => { if (x.measureText(s).width <= max) return s; while (s.length > 3 && x.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…'; };
  const OR = '#ff7a1e';
  /* the whiteboard: today's session in marker, a box per working set, the done ones ticked */
  cell('board', 600, 400, (x, w, h, T) => {
    x.fillStyle = '#e9ecef'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(110,120,140,.08)'; for (let i = 0; i < 9; i++) { x.beginPath(); x.ellipse((40 + i * 83) % w, 70 + (i * 131) % 300, 80, 20, .15, 0, TAU); x.fill(); }
    const MK = '#1f3c94', RD = '#c4302a'; x.textBaseline = 'middle';
    const code = T.s === 'REST' ? 'REST' : T.s; x.fillStyle = RD; x.font = `800 60px ${FONT_DISP}`; x.fillText(code, 22, 48); const cw = x.measureText(code).width;
    x.fillStyle = MK; x.font = `700 42px ${FONT_EN}`; x.fillText(fit(x, unesc(T.name).toUpperCase(), w - cw - 60), cw + 40, 50);
    x.strokeStyle = RD; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(22, 90); x.quadraticCurveTo(w / 2, 98, w - 30, 86); x.stroke();
    const list = T.ex.filter(e => !e.warm).slice(0, 6);
    if (!list.length) { x.fillStyle = MK; x.font = `600 34px ${FONT_EN}`; x.fillText(fit(x, (unesc(T.sub) || (T.s === 'REST' ? 'Recover' : '')).toUpperCase(), w - 50), 22, 150); }
    list.forEach((e, i) => {
      const y = 128 + i * 44; x.fillStyle = MK; x.font = `600 27px ${FONT_EN}`; x.fillText(fit(x, unesc(e.name), 370), 22, y);
      for (let k = 0; k < Math.min(e.sets, 5); k++) { const bx = 408 + k * 36; x.strokeStyle = MK; x.lineWidth = 3; x.strokeRect(bx, y - 12, 24, 24); if (k < e.done) { x.strokeStyle = RD; x.lineWidth = 4; x.beginPath(); x.moveTo(bx + 3, y); x.lineTo(bx + 11, y + 9); x.lineTo(bx + 26, y - 14); x.stroke(); } }
    });
    x.fillStyle = 'rgba(0,0,0,.1)'; x.fillRect(0, h - 8, w, 8);
  });
  /* the split: a lit chart of the week, today marked, the done days ticked */
  cell('split', 360, 500, (x, w, h, T) => {
    x.fillStyle = '#0c0b10'; x.fillRect(0, 0, w, h); x.fillStyle = OR; x.fillRect(0, 0, w, 8); x.textBaseline = 'middle';
    x.fillStyle = '#fff'; x.font = `800 46px ${FONT_DISP}`; x.fillText('SPLIT', 18, 46);
    x.fillStyle = OR; x.font = `700 26px ${FONT_EN}`; x.textAlign = 'right'; x.fillText(`${T.sDone}/${T.plan}`, w - 18, 48); x.textAlign = 'left';
    T.week.forEach((d, i) => {
      const y = 104 + i * 56;
      if (d.today) { x.fillStyle = 'rgba(255,122,30,.2)'; x.fillRect(8, y - 25, w - 16, 50); x.fillStyle = OR; x.fillRect(8, y - 25, 5, 50); }
      x.fillStyle = d.today ? '#fff' : '#9aa0ac'; x.font = `700 23px ${FONT_EN}`; x.fillText(d.dow, 22, y);
      x.fillStyle = d.c; x.fillRect(82, y - 17, 64, 34); x.fillStyle = '#0c0b10'; x.font = `800 22px ${FONT_EN}`; x.textAlign = 'center'; x.fillText(d.s === 'REST' ? 'R' : d.s, 114, y + 1); x.textAlign = 'left';
      x.fillStyle = '#e8e6ee'; x.font = `600 22px ${FONT_EN}`; x.fillText(fit(x, unesc(d.name).toUpperCase(), 138), 160, y);
      if (d.done) { x.strokeStyle = '#4cdc8e'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(w - 50, y); x.lineTo(w - 39, y + 11); x.lineTo(w - 20, y - 12); x.stroke(); }
    });
  });
  /* the interval clock over the door: red segments, the unlit ones faintly there */
  cell('led', 320, 100, (x, w, h) => { x.fillStyle = '#060507'; x.fillRect(0, 0, w, h); x.textBaseline = 'middle'; x.textAlign = 'center'; x.font = `700 74px ${FONT_MONO}`; x.fillStyle = 'rgba(255,40,30,.13)'; x.fillText('88:88', w / 2 + 14, h / 2 + 4); x.shadowColor = '#ff2a1e'; x.shadowBlur = 14; x.fillStyle = '#ff3a2a'; x.fillText('00:00', w / 2 + 14, h / 2 + 4); x.shadowBlur = 0; x.font = `700 15px ${FONT_MONO}`; x.fillStyle = '#ff6a50'; x.save(); x.translate(16, h / 2); x.rotate(-Math.PI / 2); x.fillText('REST', 0, 0); x.restore(); x.textAlign = 'left'; });
  cell('neon', 520, 130, (x, w, h) => { x.fillStyle = '#0b0908'; x.fillRect(0, 0, w, h); neon(x, 'FUERZA', 200, h / 2 + 4, `900 82px ${FONT_DISP}`, OR, '#fff0d8', 5, 16); neon(x, '鉄', 440, h / 2, `900 84px ${FONT_JP}`, '#ff3c8e', '#ffe0ee', 4, 14); });
  /* made-up words only */
  cell('pA', 220, 320, (x, w, h) => { x.fillStyle = '#111014'; x.fillRect(0, 0, w, h); x.fillStyle = OR; x.fillRect(0, 0, w, 120); x.fillStyle = '#111014'; x.font = `900 58px ${FONT_DISP}`; x.textBaseline = 'middle'; x.fillText('NORTH', 14, 44); x.fillText('SIDE', 14, 96); x.fillStyle = '#ede6d6'; x.font = `800 50px ${FONT_DISP}`; x.fillText('IRON', 14, 170); x.fillText('CLUB', 14, 222); x.fillStyle = OR; x.fillRect(14, 262, 120, 6); x.font = `600 18px ${FONT_EN}`; x.fillStyle = '#9a96a6'; x.fillText('EST. 2071 // BAY 4', 14, 292); });
  cell('pB', 220, 300, (x, w, h) => { x.fillStyle = '#e8e2d2'; x.fillRect(0, 0, w, h); x.fillStyle = '#c4302a'; x.fillRect(0, 0, w, 54); x.fillStyle = '#fff'; x.font = `800 30px ${FONT_DISP}`; x.textBaseline = 'middle'; x.fillText('RULES', 14, 28); x.fillStyle = '#1a1a20'; x.font = `700 23px ${FONT_EN}`; ['RE-RACK IT', 'CHALK IN THE BOWL', 'NO DROPPED DBS', 'WIPE IT DOWN', 'LAST SET COUNTS'].forEach((s, i) => { x.fillText((i + 1) + '. ' + s, 14, 90 + i * 40); }); });
  cell('pC', 300, 150, (x, w, h) => { x.fillStyle = '#16141c'; x.fillRect(0, 0, w, h); x.strokeStyle = '#4cdc8e'; x.lineWidth = 3; x.strokeRect(6, 6, w - 12, h - 12); x.fillStyle = '#4cdc8e'; x.font = `900 46px ${FONT_DISP}`; x.textBaseline = 'middle'; x.fillText('LIFT.', 22, 50); x.fillStyle = '#ede6d6'; x.fillText('REST.', 22, 102); x.fillStyle = OR; x.font = `900 46px ${FONT_DISP}`; x.fillText('AGAIN', 160, 102); });
  /* the plate faces: a bumper's hub label */
  cell('kg', 128, 128, (x, w, h) => { x.fillStyle = '#16161a'; x.fillRect(0, 0, w, h); x.fillStyle = '#d8d4cc'; x.beginPath(); x.arc(w / 2, h / 2, 22, 0, TAU); x.fill(); x.fillStyle = '#16161a'; x.beginPath(); x.arc(w / 2, h / 2, 12, 0, TAU); x.fill(); x.fillStyle = '#ede6d6'; x.font = `800 24px ${FONT_EN}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('20', w / 2, 22); x.textAlign = 'left'; });
  cell('tape', 256, 32, (x, w, h) => { x.fillStyle = '#f2c218'; x.fillRect(0, 0, w, h); x.fillStyle = '#121214'; for (let i = -2; i < 12; i++) { x.beginPath(); x.moveTo(i * 26, h); x.lineTo(i * 26 + 13, h); x.lineTo(i * 26 + 13 + h, 0); x.lineTo(i * 26 + h, 0); x.fill(); } });
  for (const n of Object.keys(cells)) draw(n, T);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = 8; tex.flipY = true; tex.premultiplyAlpha = false;
  /* a tick on the Training page repaints just these two */
  const paint = t => { draw('board', t); draw('split', t); tex.needsUpdate = true; };
  return { tex, C, paint };
}

function buildGym() {
  const A = GR, W = A.w / 2, D = A.d / 2, H = A.h, T = APP.train(), { dz, h: dh } = GDOOR;
  const { tex, C, paint } = gymAtlas(T); GYM_SIG = gymSig(T);
  const M = new MB(30000), Z = new MB(24000), FXM = new MB(1200), GL = new MB(16), R = rng(6120), Q = rng(6130);
  const glows = [], zGlows = [], w = (x, y, z) => [A.x + x, A.y + y, A.z + z];
  const G = (x, y, z, c, s, a = 0, list = glows) => { const k = typeof c === 'number' ? hex(c) : c; list.push({ x: A.x + x, y: A.y + y, z: A.z + z, r: k[0], g: k[1], b: k[2], s, a }); };
  const piece = () => PIECES++;
  const plate = (B, x, y, z, pw, ph, ry, cell, rx = 0, o = {}) => B.at(x, y, z, ry, () => B.plate(0, 0, 0, pw, ph, 0, C[cell], { kind: K.PAPER, em: 0, c: [1, 1, 1], ...o }), rx);
  const steel = (B = M, c = 0x3a3e4a) => B.set({ kind: K.BRASS, em: 0, layer: 0, c });
  const line = (B, x, y, z, lw, lh, ld, c, em = 200) => { setPlain(B, c, 0, em); B.box(x, y, z, lw, lh, ld, { c }); B.set({ em: 0 }); };
  /* a cylinder lying along z (bars, plates, the door's drum) or along x */
  const cylZ = (B, x, y, z, r, len, seg, c, o = {}) => B.at(x, y, z - len / 2, 0, () => B.cyl(0, 0, 0, r, r, len, seg, { c, bot: true, ...o }), Math.PI / 2);
  const cylX = (B, x, y, z, r, len, seg, c, o = {}) => B.at(x - len / 2, y, z, 0, () => B.cyl(0, 0, 0, r, r, len, seg, { c, bot: true, ...o }), 0, -Math.PI / 2);
  const CONC = 0x7a7e8a, CONC2 = 0x70747f, BAND = 0x23252d, BEAM = 0x2b2e37, OR = 0xff7a1e, AMB = 0xffb35c, HAZ = 0xf2c218, IRON = 0x1b1c22, RUB = 0x17171c;
  /* a dumbbell lying along z: handle, two hex heads */
  const dumbbell = (B, x, y, z, s, c = IRON) => { setPlain(B, 0x8a8e98); cylZ(B, x, y, z, .016 * s, .26 * s, 6, 0x8a8e98); setPlain(B, c); for (const e of [-1, 1]) cylZ(B, x, y, z + e * .16 * s, .085 * s, .12 * s, 6, c); };
  /* a kettlebell: a ball and its handle */
  const bell = (B, x, z, s, c = IRON) => { setPlain(B, c); B.lathe(x, .02, z, [[.0, 0], [.09 * s, .005], [.12 * s, .06 * s], [.125 * s, .12 * s], [.1 * s, .2 * s], [.05 * s, .23 * s], [0, .235 * s]], 12, { c }); B.tube([[x - .07 * s, .21 * s, z], [x - .08 * s, .31 * s, z], [x, .35 * s, z], [x + .08 * s, .31 * s, z], [x + .07 * s, .21 * s, z]], .016 * s, 10, 5, { c }); };

  M.at(A.x, A.y, A.z, 0, () => {
    /* floor: black rubber tiles, each its own number so the ink draws the seams */
    for (let i = 0; i < 12; i++) for (let j = 0; j < 10; j++) { setPlain(M, (i + j) % 2 ? RUB : 0x1b1b21); M.id = 20 + (i * 7 + j * 11) % 60; const x0 = -W + i, z0 = -D + j; M.quad([x0, .02, z0 + 1], [x0 + 1, .02, z0 + 1], [x0 + 1, .02, z0], [x0, .02, z0], [0, 0, 1, 1]); }
    /* ceiling: dark deck, steel beams across, a fat duct along the left */
    setPlain(M, 0x14141a); M.id = 14; M.quad([-W, H, -D], [W, H, -D], [W, H, D], [-W, H, D], [0, 0, 1, 1]);
    setPlain(M, BEAM); for (const x of [-4.5, -1.5, 1.5, 4.5]) { M.box(x, H - .42, 0, .08, .42, A.d, { id: M.nid() }); M.box(x, H - .44, 0, .22, .04, A.d, { id: M.nid() }); }
    for (const z of [-2.5, 2.5]) M.box(0, H - .5, z, A.w, .08, .1, { id: M.nid() });
    steel(M, 0x5a5e6a); cylX(M, 0, H - .62, -4.25, .22, A.w, 14, 0x5a5e6a); for (const x of [-3, 0, 3]) { M.box(x, H - .42, -4.25, .04, .42, .04, {}); } piece();

    /* walls: pale poured concrete, the lower band painted dark with an orange stripe; each pour its own number */
    const pane = (x0, x1, y0, y1, c) => { setPlain(M, c); M.id = M.nid(); M.quad([x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0], [0, 0, 1, 1], .8, .8, 1, 1); };
    const run = (a, b, k) => { const n = Math.max(1, Math.round((b - a) / 2)), s = (b - a) / n; for (let i = 0; i < n; i++) { const x0 = a + i * s, x1 = x0 + s; pane(x0, x1, 1.15, H, (i + k) % 2 ? CONC : CONC2); pane(x0, x1, 0, 1.15, BAND); } setPlain(M, OR, 0, 170); M.box((a + b) / 2, 1.15, .006, b - a, .05, .012, { c: OR }); M.set({ em: 0 }); };
    const wall = (len, gap) => { if (!gap) return run(-len / 2, len / 2, 0); run(-len / 2, -gap, 0); run(gap, len / 2, 1); pane(-gap, gap, dh, H, CONC2); };
    M.at(0, 0, -D, 0, () => wall(A.w, 0)); M.at(0, 0, D, Math.PI, () => wall(A.w, 0));
    M.at(-W, 0, 0, Math.PI / 2, () => wall(A.d, 0)); M.at(W, 0, 0, -Math.PI / 2, () => wall(A.d, dz));
    /* the door: steel guides up each side, the rolled drum under its hood, the bottom bar showing, hazard tape across the sill */
    steel(M, 0x4a4e5a); for (const s of [-1, 1]) { M.box(W - .07, 0, s * (dz + .06), .14, dh + .1, .12, { id: M.nid() }); line(M, W - .145, .1, s * (dz + .06), .004, dh - .2, .02, AMB, 120); }
    steel(M, 0x5c606c); cylZ(M, W - .32, dh + .36, 0, .3, 2 * dz + .3, 14, 0x5c606c);
    setPlain(M, 0x34373f); M.box(W - .36, dh + .68, 0, .72, .04, 2 * dz + .4, { id: M.nid() }); for (const s of [-1, 1]) M.box(W - .36, dh, s * (dz + .19), .72, .72, .03, { id: M.nid() }); M.box(W - .32, dh - .06, 0, .06, .08, 2 * dz, { id: M.nid() });
    plate(M, W - .3, .025, 0, 2 * dz, .24, Math.PI / 2, 'tape', -Math.PI / 2); piece();
    /* REST: the interval clock over the door */
    setPlain(M, 0x0c0b0e); M.box(W - .07, dh + .76, 0, .12, .5, 1.5, { id: 230 }); plate(M, W - .135, dh + 1.01, 0, 1.4, .44, -Math.PI / 2, 'led', 0, { kind: K.SIGN, em: 230, id: 230, seed: 0 }); G(W - .3, dh + 1.01, 0, [1, .16, .1], 1.1); piece();
    /* SPLIT: the week's chart, lit, high on the wall right of the door */
    { const z = 3.05, y = 3.1; setPlain(M, 0x0c0b10); M.box(W - .05, y - .78, z, .08, 1.56, 1.16, { id: 231 }); plate(M, W - .095, y, z, 1.06, 1.47, -Math.PI / 2, 'split', 0, { kind: K.SIGN, em: 170, id: 231, seed: 0 }); line(M, W - .1, y + .77, z, .012, .012, 1.14, OR, 230); G(W - .3, y, z, [1, .5, .2], 1.2); piece(); }
    /* the neon over the dumbbells */
    { setPlain(M, 0x0b0908); M.box(-.8, 3.05, -D + .03, 2.7, .7, .04, {}); plate(M, -.8, 3.4, -D + .055, 2.6, .65, 0, 'neon', 0, { kind: K.SIGN, em: 255, seed: 0 }); G(-.8, 3.4, -D + .4, [1, .45, .15], 2.6); piece(); }
    neonStrip(M, 0, H - .06, -D + .1, A.w, .03, .03, OR, 0); neonStrip(M, 0, H - .06, D - .1, A.w, .03, .03, OR, 0);

    /* RACK: a black power rack on its platform, the bar racked and loaded, a flat bench inside. Turned toward the room's middle,
       so from where he stands the bar runs across and the plates read as plates */
    M.at(1.0, 0, -1.5, .93, () => { const x = 0, z = 0, s = .6;
      setPlain(M, 0x6a4a2c, L.WOOD); M.box(x, .02, z, 2.2, .05, 2.2, { id: M.nid() }); setPlain(M, RUB); for (const e of [-1, 1]) M.box(x + e * .95, .02, z, .3, .052, 2.2, { id: M.nid() });
      setPlain(M, 0x15161b); for (const [ex, ez] of [[-s, -s], [s, -s], [-s, s], [s, s]]) M.box(x + ex, .07, z + ez, .07, 2.25, .07, { id: M.nid() });
      for (const ex of [-s, s]) { M.box(x + ex, 2.3, z, .07, .07, 2 * s + .07, {}); M.box(x + ex, .07, z, .07, .07, 2 * s + .07, {}); } for (const ez of [-s, s]) M.box(x, 2.3, z + ez, 2 * s + .07, .07, .07, {});
      line(M, x - s - .037, .3, z - s, .004, 1.9, .012, OR, 140); line(M, x - s - .037, .3, z + s, .004, 1.9, .012, OR, 140);
      /* J-hooks on the front uprights, the bar across them */
      steel(M, 0x2a2b31); for (const ez of [-s, s]) M.box(x - s - .06, 1.32, z + ez, .1, .05, .09, {});
      const bx = x - s - .07; steel(M, 0x9aa0ac); cylZ(M, bx, 1.42, z, .014, 2.2, 8, 0x9aa0ac); steel(M, 0xb8bec8); for (const e of [-1, 1]) cylZ(M, bx, 1.42, z + e * .9, .025, .42, 10, 0xb8bec8);
      for (const e of [-1, 1]) { setPlain(M, 0x15151a); cylZ(M, bx, 1.42, z + e * .8, .225, .07, 22, 0x15151a); setPlain(M, 0xb4302a); cylZ(M, bx, 1.42, z + e * .87, .225, .055, 22, 0xb4302a); setPlain(M, 0x264fa8); cylZ(M, bx, 1.42, z + e * .925, .2, .045, 20, 0x264fa8); setPlain(M, 0xd8d4cc); cylZ(M, bx, 1.42, z + e * .955, .05, .012, 14, 0xd8d4cc); }
      /* the bench, along the rack */
      setPlain(M, 0x15161b); M.box(x, .07, z, .1, .36, .25, {}); M.box(x - .45, .07, z, .1, .05, .3, {}); M.box(x + .45, .07, z, .1, .05, .3, {}); setPlain(M, 0x22232a, L.LEATHER); M.extrude(roundPoly(x, z, 1.15, .28, .04, 2), .43, .5, { grad: .86 });
      piece(); piece(); });

    /* SESSION: the rolling whiteboard */
    { const x = .6, z = 1.4, bw = 1.5, bh = .95, y = 1.42;
      steel(M, 0xb8bec8); for (const e of [-1, 1]) { M.box(x, .1, z + e * (bw / 2 + .03), .04, 1.85, .04, { id: M.nid() }); M.box(x, .08, z + e * (bw / 2 + .03), .55, .04, .05, {}); setPlain(M, 0x15151a); for (const f of [-1, 1]) M.cyl(x + f * .24, .02, z + e * (bw / 2 + .03), .035, .035, .06, 8, {}); steel(M, 0xb8bec8); }
      setPlain(M, 0xc8ccd4); M.box(x, y - bh / 2 - .03, z, .05, bh + .06, bw + .06, { id: 232 }); plate(M, x - .03, y, z, bw, bh, -Math.PI / 2, 'board', 0, { kind: K.PAPER, em: 70, id: 232, seed: 0 });
      M.box(x - .06, y - bh / 2 - .04, z, .09, .025, bw - .2, {}); for (const [dz2, c] of [[-.4, 0x1f3c94], [-.3, 0xc4302a], [-.22, 0x14141a]]) { setPlain(M, c); cylZ(M, x - .07, y - bh / 2 - .005, z + dz2, .01, .12, 6, c); }
      G(x - .5, y, z, [.9, .8, .7], 1.4); piece(); }

    /* a steel column each side of the door, as warehouses have */
    setPlain(M, BEAM); for (const s of [-1, 1]) { const zc = s * (dz + .38); M.box(W - .45, 0, zc, .3, H, .06, { id: M.nid() }); for (const f of [-1, 1]) M.box(W - .45 + f * .13, 0, zc, .04, H, .24, { id: M.nid() }); setPlain(M, HAZ); M.box(W - .45, 0, zc, .32, .5, .26, {}); setPlain(M, BEAM); }
    /* lamps: three dome pendants, warm */
    for (const [x, z] of [[1, -1.5], [.4, 1.6], [-2.6, 0]]) { setPlain(M, 0x1a1a20); M.box(x, H - 1.2, z, .012, 1.2, .012, {}); M.set({ kind: K.PLAIN, c: hex(0x2a2a30), layer: 0, em: 0 }); M.lathe(x, H - 1.42, z, [[.3, 0], [.26, .08], [.14, .18], [.05, .24], [0, .25]], 16, { c: 0x2a2a30 }); setPlain(M, 0xffe2b0, 0, 255); M.cyl(x, H - 1.42, z, .2, .2, .012, 14, { c: 0xffe2b0, top: false, bot: true }); M.set({ em: 0 }); G(x, H - 1.5, z, [1, .78, .5], 1.6); }
  });

  /* the open door: what it shows is the street outside, through the hole */
  { const x = A.x + W, q = (z0, z1, y0, y1) => { GL.set({ kind: K.GLASS, c: [1, 1, 1], id: 0 }); const u0 = (z0 + dz) / (2 * dz), u1 = (z1 + dz) / (2 * dz), v0 = y0 / dh, v1 = y1 / dh; GL.quad([x, A.y + y0, A.z + z1], [x, A.y + y0, A.z + z0], [x, A.y + y1, A.z + z0], [x, A.y + y1, A.z + z1], [u1, v0, u0, v1]); }; q(-dz, dz, .02, dh); }

  /* light on the rubber: the street's orange through the door, the lamps' pools */
  { const X = v => A.x + v, Z2 = v => A.z + v, Y = A.y;
    const blob = (x, y, z, sx, sz, c, a) => { FXM.set({ kind: 7, a, c }); FXM.quad([X(x - sx / 2), Y + y, Z2(z + sz / 2)], [X(x + sx / 2), Y + y, Z2(z + sz / 2)], [X(x + sx / 2), Y + y, Z2(z - sz / 2)], [X(x - sx / 2), Y + y, Z2(z - sz / 2)], [0, 0, 1, 1]); };
    blob(W - 1.6, .03, 0, 3.4, 4.2, [1, .48, .16], 70); blob(1, .075, -1.5, 2.4, 2.4, [1, .75, .45], 40); blob(.4, .03, 1.6, 2.2, 2.2, [1, .75, .45], 40); blob(-2.6, .03, 0, 2.4, 2.4, [1, .7, .45], 34); blob(-.8, .03, -D + .8, 3.4, 1.4, [1, .4, .15], 46); }
  const fxBase = FXM.n;

  /* ---------- clutter: the gym's stuff, kept to the walls and clear of the four that matter ---------- */
  Z.at(A.x, A.y, A.z, 0, () => {
    const pl = (c, l = 0) => setPlain(Z, c, l);
    /* the dumbbell rack along the back wall, two tiers, pairs light to heavy */
    { const x0 = -2.9, x1 = 1.3, z = -D + .45; steel(Z, 0x15161b); for (const x of [x0, (x0 + x1) / 2, x1]) Z.box(x, .02, z, .06, .82, .5, {}); for (const [y, dzz] of [[.42, .08], [.78, -.06]]) { Z.box((x0 + x1) / 2, y, z + dzz, x1 - x0, .03, .32, {}); }
      for (let i = 0; i < 9; i++) { const x = x0 + .25 + i * .46, s = .75 + i * .06; dumbbell(Z, x, .46 + .085 * s, z + .08, s); dumbbell(Z, x, .82 + .085 * s * .85, z - .06, s * .85); } piece(); piece(); }
    /* kettlebells down the wall, a pair left out */
    for (let i = 0; i < 5; i++) bell(Z, 1.9 + i * .38, -D + .35, .8 + i * .12, i === 4 ? 0x7a2a22 : IRON); bell(Z, -.2, -3.3, 1.1); bell(Z, .05, -3.5, 1.1); piece();
    /* the heavy bag on its chain in the corner */
    { const x = 4.1, z = -3.2; pl(0x2a1c18, L.LEATHER); Z.cyl(x, .55, z, .2, .2, 1.1, 16, { c: 0x2a1c18 }); pl(0x101012); Z.cyl(x, 1.62, z, .2, .17, .06, 16, {}); Z.cyl(x, .5, z, .17, .2, .05, 16, {}); pl(0x8a8e98); Z.box(x, 1.68, z, .012, H - 1.68, .012, {}); pl(OR); Z.cyl(x, 1.0, z, .202, .202, .08, 16, { top: false }); piece(); }
    /* plyo boxes stacked by the right wall, a rolled mat, a medicine ball */
    { pl(0x7a5634, L.WOOD); Z.box(-1.4, .02, D - .5, .76, .6, .6, {}); Z.box(-1.4, .62, D - .55, .6, .45, .5, {}); Z.box(-.5, .02, D - .45, .6, .5, .5, {}); pl(OR); Z.box(-1.4, .3, D - .8, .4, .06, .006, {}); piece(); }
    { pl(0x2a2f6a); Z.at(-2.5, .14, D - .4, 0, () => Z.cyl(0, -.3, 0, .12, .12, .6, 14, { c: 0x2a2f6a, bot: true }), 0, Math.PI / 2); pl(0x3a3a44); Z.blob(-3.2, .17, D - .7, .15, { c: 0x3a3a44, sy: .95, j: .08 }); piece(); }
    /* a pedestal fan aimed at the platform */
    { const x = -.4, z = 4.3; steel(Z, 0x26272e); Z.cyl(x, .02, z, .22, .22, .03, 14, {}); Z.box(x, .05, z, .04, 1.35, .04, {}); Z.at(x, 1.45, z, -2.4, () => { pl(0x1c1c22); Z.cyl(0, -.08, 0, .32, .32, .1, 18, { c: 0x1c1c22 }); pl(0x5a5e6a); Z.cyl(0, -.08, 0, .06, .06, .12, 10, {}); }, Math.PI / 2); piece(); }
    /* lockers on the back wall behind him, a water cooler, a bench */
    { steel(Z, 0x3a4250); for (let i = 0; i < 5; i++) { Z.box(-W + .3, .1, -3.6 + i * .5, .5, 1.9, .48, { id: Z.nid() }); line(Z, -W + .552, 1.6, -3.6 + i * .5, .004, .1, .02, AMB, 120); } piece(); }
    { pl(0xd8dce4); Z.box(-W + .35, .02, 1.3, .36, .95, .36, {}); pl(0x4a8ad8); Z.set({ kind: K.PLAIN, c: hex(0x4a8ad8), em: 40 }); Z.lathe(-W + .35, .97, 1.3, [[.13, 0], [.15, .05], [.15, .32], [.06, .4], [0, .41]], 14, { c: 0x4a8ad8 }); Z.set({ em: 0 }); piece(); }
    /* the gym bag, a towel on the bench, a shaker on the floor by the board */
    { pl(0x1c1d24); Z.blob(.0, .17, 2.6, .24, { c: 0x1c1d24, sy: .65, j: .12 }); pl(OR); Z.box(0, .32, 2.6, .5, .012, .03, {}); pl(0xe8e6e0); Z.box(1.0, .5, -1.45, .26, .02, .45, {}); Z.set({ kind: K.PLAIN, c: hex(0x18181e), layer: 0 }); Z.lathe(.1, .02, 1.95, [[.04, 0], [.045, .02], [.045, .2], [.03, .22], [0, .23]], 12, { c: 0x18181e }); pl(OR); Z.cyl(.1, .2, 1.95, .046, .046, .02, 12, { top: false }); piece(); piece(); }
    /* plates leant on the wall by the rack, the chalk bowl on its stand */
    for (let i = 0; i < 4; i++) { const c = [0x15151a, 0xb4302a, 0x264fa8, 0x15151a][i]; pl(c); Z.at(2.4, .02 + .225 - i * .02, -D + .28 + i * .07, 0, () => Z.cyl(0, 0, 0, .225 - i * .02, .225 - i * .02, .05, 20, { c, bot: true }), Math.PI / 2 - .12); } piece();
    { pl(0x15161b); Z.cyl(2.6, .02, -.6, .05, .05, .85, 8, {}); pl(0xdcd8d0); Z.lathe(2.6, .87, -.6, [[.0, 0], [.16, .02], [.2, .12], [.19, .13], [0, .1]], 14, { c: 0xdcd8d0 }); piece(); }
    /* posters and the rules */
    plate(Z, -W + .02, 2.4, -.6, .8, 1.16, Math.PI / 2, 'pA'); plate(Z, 2.9, 2.0, D - .02, .66, .9, Math.PI, 'pB'); plate(Z, -3.2, 2.4, -D + .02, 1.1, .55, 0, 'pC', 0, { kind: K.SIGN, em: 90, seed: 0 }); piece(); piece();
    /* a pull-up bar across the left beam, battle rope coiled under it */
    { steel(Z, 0x9aa0ac); cylZ(Z, -1.5, H - .9, -2.4, .016, 1.4, 8, 0x9aa0ac); for (const e of [-1, 1]) Z.box(-1.5, H - .9, -2.4 + e * .7, .04, .48, .04, {}); pl(0x1a1a20); const p = []; for (let k = 0; k <= 30; k++) { const a = k / 30 * TAU * 2.6, r = .32 - k * .006; p.push([-1.6 + Math.cos(a) * r, .06 + k * .004, -2.6 + Math.sin(a) * r]); } Z.tube(p, .022, 60, 5, { c: 0x1a1a20 }); piece(); }
  });

  const lights = [
    [...w(0, H - .3, 0), 0xffd9b0, 11, .5],
    [...w(W + 1.6, 1.8, 0), 0xff7a1e, 11, .85],
    [...w(W - .5, dh + 1, 0), 0xff3020, 3, .5],
    [...w(1, H - 1.6, -1.5), 0xffc890, 5, .6],
    [...w(.4, H - 1.6, 1.6), 0xffc890, 5, .55],
    [...w(-.8, 3, -D + .6), 0xff7a1e, 5, .5],
    [...w(-4, 2.8, 0), 0x9a6cff, 7, .25],
    [...w(W - .6, 3.1, 3.05), 0xffb35c, 3, .35],
  ];
  const hot = [
    { key: 'board', label: 'SESSION', hotkey: 'E', line: 16, sheet: 'cSess', p: w(.6, 1.95, 1.4) },
    { key: 'split', label: 'SPLIT', hotkey: 'R', line: 14, sheet: 'cSplit', p: w(W - .1, 3.9, 3.05) },
    { key: 'rack', label: 'RACK', hotkey: 'F', line: 22, sheet: 'cBench', p: w(1.0, 2.38, -1.5) },
    { key: 'timer', label: 'REST', hotkey: 'G', line: 12, sheet: 'cRest', p: w(W - .1, dh + 1.3, 0) },
  ];
  return {
    geom: M.geom(), clutterGeom: Z.geom(), glassGeom: GL.geom(), fxGeom: FXM.geom(), lights, hot, glows: [...glows, ...zGlows], glowsPlain: glows, clutterLight: 6, fxPlain: fxBase, pieces: PIECES, tris: M.n / 3, clutterTris: Z.n / 3, atlas: tex, day: new Date().toDateString(),
    paint, setDoor() {},
  };
}

/* a pencil, round, with a sharpened tip and a ferrule */
function pencilAt(M, x, y, z, ry, len, c, endC) {
  M.at(x, y, z, ry, () => { const r = .0052;
    M.at(0, r, -len / 2, 0, () => { M.cyl(0, 0, 0, r, r, len * .78, 8, { c, top: false }); M.cyl(0, len * .78, 0, r, .0009, len * .16, 8, { c: 0xdcc8a0, top: false }); M.cyl(0, len * .92, 0, .0012, .0002, len * .03, 5, { c: 0x202024, top: false }); M.cyl(0, -len * .03, 0, r * 1.05, r * 1.05, len * .03, 8, { c: 0xb8b8c0 }); M.cyl(0, -len * .05, 0, r, r, len * .02, 8, { c: endC, top: false, bot: true }); }, Math.PI / 2);
  });
}
/* a cushion turned on a lathe, with tuft seams */
function cushion(M, x, y, z, r, c) {
  const pr = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI; pr.push([Math.cos(a) * r * (1 + .08 * Math.sin(a * 3)), r * .86 + Math.sin(a) * r * .86]); }
  M.set({ kind: K.PLAIN, c: hex(c), em: 0, layer: 0 }); M.lathe(x, y, z, pr, 24, { c, grad: .72 });
  M.set({ kind: K.PLAIN, c: hex(mixC(c, 0x000000, .4)), em: 0, layer: 0 }); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI; for (let j = 0; j < 8; j++) { const t0 = .15 + j / 8 * 2.84, t1 = t0 + 2.84 / 8; for (const s of [1, -1]) { const P = t => [x + Math.cos(a) * Math.sin(t) * r * 1.01 * s, y + r * .86 + Math.cos(t) * r * .87, z + Math.sin(a) * Math.sin(t) * r * 1.01 * s]; const p0 = P(t0), p1 = P(t1); const e = .0011; M.quad([p0[0] - e, p0[1], p0[2] - e], [p0[0] + e, p0[1], p0[2] + e], [p1[0] + e, p1[1], p1[2] + e], [p1[0] - e, p1[1], p1[2] - e]); M.quad([p1[0] - e, p1[1], p1[2] - e], [p1[0] + e, p1[1], p1[2] + e], [p0[0] + e, p0[1], p0[2] + e], [p0[0] - e, p0[1], p0[2] - e]); } } }
  M.set({ kind: K.BRASS, c: PAL.brass }); M.lathe(x, y + r * 1.7, z, [[.0, .002], [r * .2, 0], [.0, -.002]], 10, {});
}

/* ---------- the chalet: a timber kitchen high on the slope, Fuel and Cardio in one room ---------- */
/* Its +X gable end is the city chalet's glass (x = CH.x + 4.5): the lift station, the gondola line and the village lights through it */
const CR = { x: CH.x, y: CH.y, z: CH.z, w: 9, d: 6.4, h: 2.7 };
/* what the fridge list, the cookbook and the ticket show, so they're only repainted when it changes */
const chaletSig = F => JSON.stringify([F.book, F.list.map(s => s.items.map(i => i.n + (i.on ? 1 : 0))), F.picked.map(p => p.n), F.cardio.min, F.cardio.n, F.shakes.map(s => s.on)]);
let CH_SIG = '';
function chaletAtlas(F) {
  const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'), C = {}, cells = {};
  let cx = 0, cy = 0, rowH = 0;
  const cell = (name, w, h, fn) => { if (cx + w > S) { cx = 0; cy += rowH + 2; rowH = 0; } if (cy + h > S) console.error('chalet atlas overflow', name); cells[name] = { px: cx, py: cy, w, h, fn }; C[name] = [cx / S + .0008, 1 - (cy + h) / S + .0008, (cx + w) / S - .0008, 1 - cy / S - .0008]; cx += w + 2; rowH = Math.max(rowH, h); };
  const draw = (name, t) => { const c = cells[name]; x.save(); x.beginPath(); x.rect(c.px, c.py, c.w, c.h); x.clip(); x.translate(c.px, c.py); x.clearRect(0, 0, c.w, c.h); c.fn(x, c.w, c.h, t); x.restore(); };
  const fit = (x, s, max) => { if (x.measureText(s).width <= max) return s; while (s.length > 3 && x.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…'; };
  const INK = '#23324a', PEN = '#b8322a';
  /* the list on the fridge: a lined pad, what this week's meals need, ticked as it goes in the cart */
  cell('list', 380, 540, (x, w, h, F) => {
    x.fillStyle = '#f4efe2'; x.fillRect(0, 0, w, h); x.fillStyle = '#e6a33a'; x.fillRect(0, 0, w, 26);
    x.strokeStyle = 'rgba(70,110,170,.25)'; x.lineWidth = 2; for (let y = 104; y < h; y += 38) { x.beginPath(); x.moveTo(0, y + 14); x.lineTo(w, y + 14); x.stroke(); }
    x.strokeStyle = 'rgba(200,60,60,.35)'; x.beginPath(); x.moveTo(52, 26); x.lineTo(52, h); x.stroke();
    x.textBaseline = 'middle'; x.fillStyle = INK; x.font = `800 46px ${FONT_DISP}`; x.fillText('LIST', 64, 64);
    x.fillStyle = PEN; x.font = `700 30px ${FONT_EN}`; x.textAlign = 'right'; x.fillText(F.all ? `${F.done}/${F.all}` : '', w - 20, 66); x.textAlign = 'left';
    const rows = []; F.list.forEach(s => { rows.push({ sec: unesc(s.sec) }); s.items.forEach(i => rows.push(i)); });
    if (!rows.length) { x.fillStyle = INK; x.font = `600 30px ${FONT_EN}`; x.fillText(F.book ? 'PICK MEALS IN' : '', 64, 140); x.fillText(F.book ? 'THE COOKBOOK' : '', 64, 178); }
    rows.slice(0, 11).forEach((r, k) => {
      const y = 116 + k * 38;
      if (r.sec) { x.fillStyle = PEN; x.font = `800 22px ${FONT_EN}`; x.fillText(r.sec.toUpperCase(), 64, y + 2); return; }
      x.fillStyle = INK; x.font = `600 27px ${FONT_EN}`; const t = fit(x, unesc(r.n), w - 110); x.fillText(t, 64, y);
      if (r.on) { const tw = x.measureText(t).width; x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.moveTo(60, y + 1); x.lineTo(68 + tw, y - 2); x.stroke(); x.strokeStyle = PEN; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(18, y); x.lineTo(27, y + 9); x.lineTo(42, y - 12); x.stroke(); }
    });
    if (rows.length > 11) { x.fillStyle = INK; x.font = `600 24px ${FONT_EN}`; x.fillText(`+ ${rows.length - 11} MORE`, 64, h - 22); }
  });
  /* the lift ticket on the jacket: a made-up resort, the week's minutes in pen, a barcode */
  cell('ticket', 200, 290, (x, w, h, F) => {
    x.fillStyle = '#f2f2ee'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff2e88'; x.fillRect(0, 0, w, 64); x.fillStyle = '#16121c'; x.beginPath(); x.arc(w / 2, 14, 8, 0, TAU); x.fill();
    x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = `900 30px ${FONT_DISP}`; x.fillText('VELKAR', w / 2, 44);
    x.fillStyle = '#16121c'; x.font = `700 18px ${FONT_EN}`; x.fillText('ALL LIFTS · WEEK', w / 2, 86);
    x.font = `800 64px ${FONT_DISP}`; x.fillText(String(F.cardio.min), w / 2, 140); x.font = `700 20px ${FONT_EN}`; x.fillText(`MIN OF ${F.cardio.goal}`, w / 2, 182);
    for (let i = 0; i < 34; i++) { const bw = (i * 7) % 3 + 1; x.fillRect(20 + i * 4.8, 214, bw, 50); } x.textAlign = 'left';
  });
  /* a trail poster, made-up words */
  cell('trail', 260, 360, (x, w, h) => {
    x.fillStyle = '#20324a'; x.fillRect(0, 0, w, h); x.fillStyle = '#e9e4d8'; x.beginPath(); x.moveTo(0, 300); x.lineTo(90, 150); x.lineTo(140, 210); x.lineTo(205, 100); x.lineTo(w, 260); x.lineTo(w, h); x.lineTo(0, h); x.fill();
    x.strokeStyle = '#ff2e88'; x.lineWidth = 4; x.setLineDash([8, 7]); x.beginPath(); x.moveTo(205, 104); x.quadraticCurveTo(170, 220, 120, 320); x.stroke(); x.strokeStyle = '#2a8a5a'; x.beginPath(); x.moveTo(205, 104); x.quadraticCurveTo(240, 230, 230, 360); x.stroke(); x.setLineDash([]);
    x.textBaseline = 'middle'; x.fillStyle = '#f6ee1c'; x.font = `900 44px ${FONT_DISP}`; x.fillText('VELKAR', 22, 44); x.fillStyle = '#e9e4d8'; x.font = `700 22px ${FONT_EN}`; x.fillText('RIDGE · EST 1961', 24, 82);
  });
  /* a jar label for the shelf */
  cell('jar', 96, 64, (x, w, h) => { x.fillStyle = '#efe6d0'; x.fillRect(0, 0, w, h); x.strokeStyle = '#3a2a1a'; x.lineWidth = 3; x.strokeRect(5, 5, w - 10, h - 10); x.fillStyle = '#3a2a1a'; x.font = `700 22px ${FONT_EN}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('OATS', w / 2, h / 2); x.textAlign = 'left'; });
  /* the cookbook, open on its stand: this week's meals on the left page, a sketch and the protein on the right */
  cell('book', 600, 380, (x, w, h, F) => {
    x.fillStyle = '#efe6d0'; x.fillRect(0, 0, w, h);
    const g = x.createLinearGradient(w / 2 - 40, 0, w / 2 + 40, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, 'rgba(60,40,20,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(w / 2 - 40, 0, 80, h);
    x.textBaseline = 'middle'; x.fillStyle = '#3a2a1a'; x.font = `800 30px ${FONT_DISP}`; x.fillText('THIS WEEK', 28, 44);
    x.strokeStyle = '#a8442a'; x.lineWidth = 3; x.beginPath(); x.moveTo(28, 68); x.lineTo(w / 2 - 34, 68); x.stroke();
    const P = F.picked.slice(0, 6);
    if (!P.length) { x.fillStyle = '#5a4630'; x.font = `600 24px ${FONT_EN}`; x.fillText(F.book ? 'Nothing picked yet.' : 'Opening the book…', 28, 110); }
    P.forEach((p, i) => { const y = 104 + i * 50; x.fillStyle = '#3a2a1a'; x.font = `700 25px ${FONT_EN}`; x.fillText(fit(x, unesc(p.n), w / 2 - 120), 28, y); x.fillStyle = '#a8442a'; x.font = `700 21px ${FONT_EN}`; x.textAlign = 'right'; x.fillText(`${p.p}g`, w / 2 - 34, y + 1); x.textAlign = 'left'; });
    /* the right page: a pot drawn in ink and the week's protein */
    const rx = w / 2 + 30; x.fillStyle = '#3a2a1a'; x.font = `800 26px ${FONT_DISP}`; x.fillText('KITCHEN', rx, 44);
    x.strokeStyle = '#3a2a1a'; x.lineWidth = 3; x.beginPath(); x.ellipse(rx + 130, 210, 92, 22, 0, 0, TAU); x.stroke(); x.beginPath(); x.moveTo(rx + 38, 210); x.lineTo(rx + 52, 300); x.quadraticCurveTo(rx + 130, 330, rx + 208, 300); x.lineTo(rx + 222, 210); x.stroke();
    for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(rx + 100 + i * 30, 170); x.bezierCurveTo(rx + 85 + i * 30, 140, rx + 115 + i * 30, 120, rx + 100 + i * 30, 92); x.stroke(); }
    x.fillStyle = '#a8442a'; x.font = `700 24px ${FONT_EN}`; x.fillText(P.length ? `${P.length} MEAL${P.length === 1 ? '' : 'S'} · 3 PORTIONS EACH` : '', rx, 352);
  });
  /* the stove's glass: embers and flame */
  cell('fire', 160, 120, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h, 6, w / 2, h * .8, w * .7); g.addColorStop(0, '#fff2b0'); g.addColorStop(.35, '#ff9a2a'); g.addColorStop(.7, '#a8300c'); g.addColorStop(1, '#1a0804'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,220,140,.8)'; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(20 + i * 28, h - 10); x.quadraticCurveTo(30 + i * 28, h - 70 - (i % 2) * 20, 34 + i * 28, h - 98 + (i % 3) * 14); x.quadraticCurveTo(44 + i * 28, h - 50, 46 + i * 28, h - 10); x.fill(); }
  });
  /* book spines for the shelf over the door */
  cell('spines', 256, 64, (x, w, h) => { const cs = ['#7a2a22', '#24405a', '#c9a23a', '#2f4a3c', '#e8e0d0', '#5a3a6a', '#a8442a', '#16121c']; for (let i = 0; i < 16; i++) { x.fillStyle = cs[(i * 5) % cs.length]; x.fillRect(i * 16, 0, 15, h); x.fillStyle = 'rgba(255,240,200,.5)'; x.fillRect(i * 16 + 3, 12, 9, 3); x.fillRect(i * 16 + 3, h - 16, 9, 2); } });
  for (const n of Object.keys(cells)) draw(n, F);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = 8; tex.flipY = true; tex.premultiplyAlpha = false;
  /* a tick in the app repaints just these three */
  const paint = f => { draw('list', f); draw('book', f); draw('ticket', f); tex.needsUpdate = true; };
  return { tex, C, paint };
}

function buildChalet() {
  const A = CR, W = A.w / 2, D = A.d / 2, H = A.h, RH = H + 2.85, F = APP.fuel();
  const { tex, C, paint } = chaletAtlas(F); CH_SIG = chaletSig(F);
  const M = new MB(30000), Z = new MB(24000), FXM = new MB(1200), GL = new MB(64), R = rng(7120);
  const glows = [], zGlows = [], w = (x, y, z) => [A.x + x, A.y + y, A.z + z];
  const G = (x, y, z, c, s, a = 0, list = glows) => { const k = typeof c === 'number' ? hex(c) : c; list.push({ x: A.x + x, y: A.y + y, z: A.z + z, r: k[0], g: k[1], b: k[2], s, a }); };
  const piece = () => PIECES++;
  const plate = (B, x, y, z, pw, ph, ry, cell, rx = 0, o = {}) => B.at(x, y, z, ry, () => B.plate(0, 0, 0, pw, ph, 0, C[cell], { kind: K.PAPER, em: 0, c: [1, 1, 1], ...o }), rx);
  const brass = (B, c = 0xc9a24e) => B.set({ kind: K.BRASS, em: 0, layer: 0, c });
  const line = (B, x, y, z, lw, lh, ld, c, em = 200) => { setPlain(B, c, 0, em); B.box(x, y, z, lw, lh, ld, { c }); B.set({ em: 0 }); };
  const cylZ = (B, x, y, z, r, len, seg, c, o = {}) => B.at(x, y, z - len / 2, 0, () => B.cyl(0, 0, 0, r, r, len, seg, { c, bot: true, ...o }), Math.PI / 2);
  const cylX = (B, x, y, z, r, len, seg, c, o = {}) => B.at(x - len / 2, y, z, 0, () => B.cyl(0, 0, 0, r, r, len, seg, { c, bot: true, ...o }), 0, -Math.PI / 2);
  const PINE = [0x76583f, 0x806246, 0x6e5139, 0x88694b], BEAM = 0x4a2e1c, FLOOR = [0x5e3c26, 0x684430, 0x56381f], CAB = 0x2f4a3c, TOP = 0xa8784a, CREAM = 0xe8e0c8, IRON = 0x1a1a1e, STONE = 0x4a4652;
  /* a stool: round seat, four splayed legs, a footrest ring */
  const stool = (B, x, z) => { setPlain(B, BEAM, L.WOOD); B.cyl(x, .66, z, .19, .19, .05, 16, { c: BEAM }); for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + .78, r0 = .12, r1 = .2; B.beam([x + Math.cos(a) * r1, 0, z + Math.sin(a) * r1], [x + Math.cos(a) * r0, .66, z + Math.sin(a) * r0], .035, {}); } setPlain(B, 0x2a2a2e); B.at(x, .25, z, 0, () => B.lathe(0, 0, 0, [[.165, 0], [.17, .012], [.165, .024]], 16, {})); };

  M.at(A.x, A.y, A.z, 0, () => {
    /* floor: wide planks along the room, each its own number so the ink draws the seams */
    for (let i = 0; i < 21; i++) { const z0 = -D + i * (A.d / 21), z1 = z0 + A.d / 21; let x0 = -W; let k = i; while (x0 < W) { const len = Math.min(W - x0, 1.6 + ((k * 37) % 7) * .35); setPlain(M, FLOOR[k % 3], L.WOOD); M.id = 20 + (i * 7 + k * 13) % 70; M.quad([x0, .02, z1], [x0 + len, .02, z1], [x0 + len, .02, z0], [x0, .02, z0], [0, 0, 1, 1]); x0 += len; k++; } }
    /* walls: knotty pine boards, run level, a darker skirting */
    const boards = (len, h0, h1, k0, skip) => { for (let j = 0, y = h0; y < h1 - .01; j++, y += .18) { const y1 = Math.min(h1, y + .18); let a = -len / 2, k = j + k0; while (a < len / 2 - .01) { const b = Math.min(len / 2, a + 1.4 + ((k * 29) % 5) * .4); if (!skip || !skip(a, b, y, y1)) { setPlain(M, PINE[k % 4], L.WOOD); M.id = M.nid(); M.quad([a, y, 0], [b, y, 0], [b, y1, 0], [a, y1, 0], [0, 0, 1, 1], .85, .85, 1, 1); } else if (skip) { const s = skip(a, b, y, y1); if (s && s.length) for (const [p, q] of s) { setPlain(M, PINE[k % 4], L.WOOD); M.id = M.nid(); M.quad([p, y, 0], [q, y, 0], [q, y1, 0], [p, y1, 0], [0, 0, 1, 1], .85, .85, 1, 1); } } a = b; k++; } } setPlain(M, BEAM); M.box(0, .02, .015, len, .12, .03, {}); };
    /* the left wall (uphill, -Z) has the door at the back: boards either side of it */
    const doorX = [-3.3, -2.3], doorH = 2.1;
    const doorSkip = (a, b, y0, y1) => { if (y0 >= doorH || b <= doorX[0] || a >= doorX[1]) return null; const out = []; if (a < doorX[0]) out.push([a, doorX[0]]); if (b > doorX[1]) out.push([doorX[1], b]); return out; };
    M.at(0, 0, -D, 0, () => boards(A.w, 0, H, 0, doorSkip));
    M.at(0, 0, D, Math.PI, () => boards(A.w, 0, H, 2));
    M.at(-W, 0, 0, Math.PI / 2, () => boards(A.d, 0, H, 1));
    /* the back gable above the wall line, and the front one above the glass, boarded the same */
    for (const [gx, s] of [[-W + .005, 1], [W - .005, -1]]) for (let j = 0, y = H; y < RH - .05; j++, y += .2) { const y1 = Math.min(RH, y + .2), h0 = D * (1 - (y - H) / (RH - H)), h1 = D * (1 - (y1 - H) / (RH - H)); setPlain(M, PINE[j % 4], L.WOOD); M.id = M.nid(); if (s > 0) M.quad([gx, y, h0], [gx, y, -h0], [gx, y1, -h1], [gx, y1, h1], [0, 0, 1, 1]); else M.quad([gx, y, -h0], [gx, y, h0], [gx, y1, h1], [gx, y1, -h1], [0, 0, 1, 1]); }
    /* the vaulted ceiling: boards up each slope, a ridge beam, rafters, tie beams across at the wall line */
    for (const s of [-1, 1]) for (let j = 0; j < 9; j++) { const t0 = j / 9, t1 = (j + 1) / 9, za = s * D * (1 - t0), zb = s * D * (1 - t1), ya = H + (RH - H) * t0, yb = H + (RH - H) * t1; setPlain(M, j % 2 ? 0x8e7052 : 0x86684a, L.WOOD); M.id = M.nid(); if (s < 0) M.quad([-W, ya, za], [W, ya, za], [W, yb, zb], [-W, yb, zb], [0, 0, 1, 1]); else M.quad([W, ya, za], [-W, ya, za], [-W, yb, zb], [W, yb, zb], [0, 0, 1, 1]); }
    setPlain(M, BEAM, L.WOOD); M.box(0, RH - .34, 0, A.w, .3, .22, { id: M.nid() });
    for (let i = 0; i < 7; i++) { const x = -W + .3 + i * (A.w - .6) / 6; for (const s of [-1, 1]) M.beam([x, H - .02, s * (D - .02)], [x, RH - .2, 0], .14, { id: M.nid() }); }
    for (const x of [-2.25, 0, 2.25]) M.box(x, H - .1, 0, .2, .22, A.d, { id: M.nid() });
    piece();

    /* the glass end: frames in dark timber, posts at -1.5, 0, 1.5, a transom, a sill band, the jambs either side */
    setPlain(M, BEAM, L.WOOD); for (const z of [-1.5, 0, 1.5]) M.box(W - .05, 0, z, .12, 2.6, .1, { id: M.nid() }); M.box(W - .05, 2.02, 0, .12, .07, 6, { id: M.nid() }); M.box(W - .05, 2.6, 0, .14, .12, A.d, { id: M.nid() });
    for (const s of [-1, 1]) { M.box(W - .05, 0, s * 3.1, .14, 2.7, .2, { id: M.nid() }); } M.box(W - .05, 0, 0, .14, .04, 6, { id: M.nid() });
    piece();

    /* the door at the back of the left wall: a plank door, its frame, a little frosted window, an iron latch */
    { const [a, b] = doorX, xm = (a + b) / 2; setPlain(M, BEAM, L.WOOD); M.box(a - .05, 0, -D + .04, .1, doorH + .08, .08, {}); M.box(b + .05, 0, -D + .04, .1, doorH + .08, .08, {}); M.box(xm, doorH, -D + .04, b - a + .2, .1, .08, {});
      for (let k = 0; k < 5; k++) { setPlain(M, PINE[(k + 1) % 4], L.WOOD); M.box(a + .1 + k * .2, 0, -D + .02, .19, doorH, .04, { id: M.nid() }); }
      setPlain(M, 0x8a9ab4, 0, 30); M.box(xm, 1.45, -D + .045, .36, .36, .01, {}); setPlain(M, BEAM); M.box(xm, 1.61, -D + .05, .4, .04, .02, {}); M.box(xm, 1.43, -D + .05, .02, .4, .02, {});
      setPlain(M, IRON); M.box(b - .14, 1.0, -D + .07, .04, .16, .04, {}); M.box(b - .2, 1.06, -D + .07, .14, .025, .03, {}); piece(); }

    /* the kitchen run along the right wall: green cabinets, a butcher-block top, tiles, the sink, the range and its copper hood */
    { const z0 = D - .62, top = .9, xa = -2.7, xb = 2.5;
      setPlain(M, CAB); M.box((xa + xb) / 2, .1, D - .31, xb - xa, top - .14, .6, { id: M.nid() }); setPlain(M, 0x1a1a1e); M.box((xa + xb) / 2, 0, D - .36, xb - xa, .1, .5, {});
      /* doors and drawers on the fronts, brass knobs */
      for (let i = 0; i < 9; i++) { const x0 = xa + .04 + i * (xb - xa) / 9, x1 = x0 + (xb - xa) / 9 - .06, xm = (x0 + x1) / 2; if (xm > .45 && xm < 1.25) continue; setPlain(M, 0x35523f); M.box(xm, .16, z0 - .012, x1 - x0, .52, .02, { id: M.nid() }); M.box(xm, .72, z0 - .012, x1 - x0, .12, .02, { id: M.nid() }); brass(M); M.cyl(xm, .62, z0 - .03, .014, .014, .02, 8, {}); M.box(xm, .775, z0 - .028, .12, .012, .012, {}); }
      setPlain(M, TOP, L.WOOD); M.box((xa + xb) / 2, top - .04, D - .33, xb - xa + .04, .045, .68, { id: M.nid() });
      /* tiles up to the cabinets, cream with a little shine */
      setPlain(M, 0xe8e0d0, L.TILE); M.at(0, 0, D - .005, Math.PI, () => { M.id = M.nid(); M.quad([-xb, top, 0], [-xa, top, 0], [-xa, 1.48, 0], [-xb, 1.48, 0], [0, 0, (xb - xa) * 4, 2.3]); });
      /* the sink: a deep white basin set in, a brass bridge tap */
      setPlain(M, 0xf0ece4); M.box(-.6, top - .22, D - .32, .64, .245, .6, {}); setPlain(M, 0x8a9098); M.box(-.6, top + .026, D - .3, .54, .002, .46, {});
      brass(M); M.tube([[-.6, top, D - .1], [-.6, top + .26, D - .1], [-.6, top + .32, D - .18], [-.6, top + .26, D - .3]], .014, 10, 6, {}); for (const e of [-1, 1]) M.cyl(-.6 + e * .1, top, D - .1, .018, .018, .08, 8, {});
      /* the range: black enamel, an oven door with its glass, four burners, knobs */
      setPlain(M, 0x17171b); M.box(.85, .02, D - .32, .8, top - .02, .62, { id: M.nid() }); setPlain(M, 0x2a2a30); M.box(.85, .18, z0 - .01, .66, .5, .02, {}); setPlain(M, 0x120c0a, 0, 40); M.box(.85, .36, z0 - .022, .42, .2, .01, {}); brass(M, 0xb8bec8); cylX(M, .85, .72, z0 - .06, .012, .6, 8, 0xb8bec8);
      for (let k = 0; k < 5; k++) { setPlain(M, 0xd8d4cc); M.cyl(.6 + k * .125, .79, z0 - .03, .022, .022, .03, 10, {}); }
      setPlain(M, 0x0e0e10); for (const [dx, dz] of [[-.2, -.15], [.2, -.15], [-.2, .15], [.2, .15]]) M.cyl(.85 + dx, top, D - .33 + dz, .1, .1, .015, 14, {});
      /* the hood, copper, up to the ceiling */
      brass(M, 0x7a4e2c); M.loft([rectPoly(.85, D - .33, .86, .62).map(p => [p[0], 1.72, p[1]]), rectPoly(.85, D - .2, .34, .3).map(p => [p[0], 2.3, p[1]])], { grad: .7 }); M.box(.85, 2.3, D - .2, .32, H + .4 - 2.3, .28, {});
      /* the upper cabinets left of the range, an open shelf over the sink */
      setPlain(M, CAB); M.box(-1.85, 1.55, D - .18, 1.7, .72, .34, { id: M.nid() }); for (let k = 0; k < 3; k++) { setPlain(M, 0x35523f); M.box(-2.5 + k * .57, 1.59, D - .355, .53, .64, .02, { id: M.nid() }); brass(M); M.cyl(-2.28 + k * .57, 1.66, D - .37, .012, .012, .02, 8, {}); }
      setPlain(M, TOP, L.WOOD); M.box(-.6, 1.62, D - .14, .9, .04, .28, {}); setPlain(M, IRON); for (const e of [-1, 1]) M.box(-.6 + e * .38, 1.5, D - .2, .02, .12, .16, {});
      setPlain(M, CAB); M.box(1.95, 1.55, D - .18, 1.0, .72, .34, { id: M.nid() }); setPlain(M, 0x35523f); M.box(1.95, 1.59, D - .355, .94, .64, .02, { id: M.nid() });
      piece(); piece(); }

    /* FRIDGE: a cream retro fridge at the end of the run, rounded, chrome handles. The list is pinned on its door */
    { const x = 2.98, zf = D - .37, fw = .74, fd = .7, fh = 1.86;
      setPlain(M, CREAM); M.extrude(roundPoly(x, zf, fw, fd, .08, 3), .04, fh - .12, { grad: .82 }); M.loft([roundPoly(x, zf, fw, fd, .08, 3).map(p => [p[0], fh - .12, p[1]]), roundPoly(x, zf, fw - .1, fd - .1, .06, 3).map(p => [p[0], fh, p[1]])], { grad: .9 });
      setPlain(M, 0x1a1a1e); M.box(x, 0, zf, fw - .1, .06, fd - .1, {});
      setPlain(M, 0xd4ccb4); M.box(x, 1.32, zf - fd / 2 - .002, fw - .04, .012, .006, {});
      brass(M, 0xd0d4dc); for (const [y0, y1] of [[1.42, 1.66], [.62, 1.18]]) { M.box(x - fw / 2 + .08, y0, zf - fd / 2 - .04, .03, y1 - y0, .025, {}); M.box(x - fw / 2 + .08, y0, zf - fd / 2 - .02, .03, .025, .04, {}); M.box(x - fw / 2 + .08, y1 - .025, zf - fd / 2 - .02, .03, .025, .04, {}); }
      plate(M, x + .06, 1.0, zf - fd / 2 - .006, .34, .48, Math.PI, 'list', 0, { kind: K.PAPER, em: 40, id: 240, seed: 0 });
      for (const [dx, dy, c] of [[-.08, .23, 0xff2e88], [.18, .22, 0x2a8a5a]]) { setPlain(M, c); M.cyl(x + .06 + dx, 1.0 + dy, zf - fd / 2 - .012, .022, .022, .012, 10, {}); }
      piece(); piece(); }

    /* the island: green base, a thick butcher-block top overhanging toward the stools */
    { const x0 = -.2, x1 = 2.2, za = -.6, zb = .45;
      setPlain(M, CAB); M.box((x0 + x1) / 2, .1, (za + zb) / 2 + .1, x1 - x0, .78, zb - za - .2, { id: M.nid() }); setPlain(M, 0x1a1a1e); M.box((x0 + x1) / 2, 0, (za + zb) / 2 + .1, x1 - x0 - .1, .1, zb - za - .3, {});
      for (let i = 0; i < 3; i++) { setPlain(M, 0x35523f); M.box(x0 + .4 + i * .8, .16, zb - .005, .72, .64, .02, { id: M.nid() }); brass(M); M.cyl(x0 + .4 + i * .8, .74, zb + .01, .014, .014, .02, 8, {}); }
      setPlain(M, TOP, L.WOOD); M.box((x0 + x1) / 2, .88, (za + zb) / 2, x1 - x0 + .1, .07, zb - za + .1, { id: M.nid() }); piece(); }

    /* COOKBOOK: open on a wooden stand at the island's near end, turned to him */
    { const x = .45, z = -.12, y = .95, tilt = -.42;
      setPlain(M, BEAM, L.WOOD); M.box(x + .1, y, z, .22, .02, .5, {}); M.beam([x, y, z - .2], [x + .18, y + .32, z - .2], .025, {}); M.beam([x, y, z + .2], [x + .18, y + .32, z + .2], .025, {}); M.box(x - .02, y, z, .05, .04, .5, {});
      M.at(x + .07, y + .19, z, -Math.PI / 2, () => { setPlain(M, 0x7a2a22); M.box(0, -.14, -.03, .62, .3, .018, {}); setPlain(M, 0xf2ead6); M.box(-.152, -.135, -.002, .3, .285, .02, {}); M.box(.152, -.135, -.002, .3, .285, .02, {}); M.plate(0, .007, .0105, .6, .28, 0, C.book, { kind: K.PAPER, em: 30, id: 241, seed: 0 }); }, tilt); piece(); }

    /* BLENDER: on the island, a steel base, a glass jar half full of something pink */
    { const x = 1.6, z = .15, y = .915;
      setPlain(M, 0x2a2a30); M.extrude(roundPoly(x, z, .2, .2, .04, 3), y, y + .14, { grad: .8 }); brass(M, 0xc8ccd4); M.box(x - .101, y + .04, z, .004, .06, .14, {}); setPlain(M, 0xff4a2a, 0, 200); M.cyl(x - .104, y + .085, z + .04, .008, .008, .004, 8, {});
      M.set({ kind: K.PLAIN, c: hex(0xd8e4ec), em: 0, layer: 0 }); M.lathe(x, y + .14, z, [[.06, 0], [.075, .02], [.085, .22], [.08, .26], [0, .262]], 14, { c: 0xd8e4ec });
      setPlain(M, 0xe86a9a); M.lathe(x, y + .16, z, [[.0, 0], [.068, .005], [.078, .12], [0, .12]], 14, { c: 0xe86a9a });
      setPlain(M, 0x1a1a1e); M.cyl(x, y + .4, z, .086, .086, .03, 14, {}); M.cyl(x, y + .43, z, .03, .03, .03, 10, {}); M.box(x + .09, y + .2, z, .03, .16, .03, {});
      piece(); }

    /* the stools on the near side of the island */
    for (const sx of [.4, 1.1, 1.8]) stool(M, sx, -1.0); piece();

    /* TICKET: a ski jacket over the far stool, the lift ticket on its zip, turned to him */
    { const x = 1.8, z = -1.0; setPlain(M, 0xc0302a); M.blob(x, .74, z, .24, { c: 0xc0302a, sy: .45, j: .1 }); M.blob(x + .02, .55, z - .2, .2, { c: 0xb02a24, sy: .9, j: .12 }); setPlain(M, 0x1a1a1e); M.box(x - .02, .4, z - .3, .02, .34, .02, {});
      setPlain(M, 0x16121c); M.box(x - .1, .52, z - .3, .008, .14, .004, {});
      plate(M, x - .11, .41, z - .29, .1, .145, -Math.PI / 2, 'ticket', 0, { kind: K.PAPER, em: 40, id: 242, seed: 0 }); piece(); }

    /* the stove in the front-left corner on a stone hearth, its glass glowing, the flue up through the roof */
    { const x = 2.9, z = -2.3;
      setPlain(M, STONE, L.BRICK); M.box(x + .1, 0, z - .1, 1.3, .06, 1.2, { id: M.nid() }); M.at(0, 0, -D + .01, 0, () => { M.id = M.nid(); M.quad([x - .7, 0, 0], [x + .9, 0, 0], [x + .9, 1.9, 0], [x - .7, 1.9, 0], [0, 0, 3, 3.6]); });
      setPlain(M, IRON); M.box(x, .2, z, .56, .56, .5, { id: M.nid() }); for (const [dx, dz] of [[-.24, -.2], [.24, -.2], [-.24, .2], [.24, .2]]) M.box(x + dx, .06, z + dz, .05, .14, .05, {}); M.box(x, .76, z, .6, .04, .54, {});
      plate(M, x - .282, .48, z, .3, .22, -Math.PI / 2, 'fire', 0, { kind: K.SIGN, em: 150, id: 243, seed: 0 }); setPlain(M, 0x2a2a2e); M.box(x - .29, .36, z, .02, .02, .34, {}); M.box(x - .29, .6, z, .02, .02, .34, {});
      M.cyl(x, .8, z, .075, .075, RH - .8, 12, { c: IRON }); G(x - .45, .5, z, [1, .5, .15], 1.2); piece(); piece(); }

    /* pendant lamps over the island: copper domes on cords from the tie beam */
    for (const x of [.5, 1.6]) { setPlain(M, 0x1a1a20); M.box(x, 1.95, -.1, .012, RH - .34 - 1.95, .012, {}); brass(M, 0xb87333); M.lathe(x, 1.78, -.1, [[.2, 0], [.18, .06], [.1, .14], [.03, .18], [0, .19]], 16, {}); setPlain(M, 0xffe2b0, 0, 255); M.cyl(x, 1.76, -.1, .06, .06, .04, 10, {}); G(x, 1.74, -.1, [1, .8, .5], .9); }
    /* a warm strip under the upper cabinets */
    line(M, -1.85, 1.53, D - .3, 1.6, .012, .03, 0xffc890, 200); line(M, 1.95, 1.53, D - .3, .9, .012, .03, 0xffc890, 200);
    piece();
  });

  /* the glass: what it shows is the slope, the lift and the village, through the hole */
  { const x = A.x + W, zs = 3, yh = 2.6, q = (z0, z1, y0, y1) => { GL.set({ kind: K.GLASS, c: [1, 1, 1], id: 0 }); const u0 = (z0 + zs) / (2 * zs), u1 = (z1 + zs) / (2 * zs), v0 = y0 / yh, v1 = y1 / yh; GL.quad([x, A.y + y0, A.z + z1], [x, A.y + y0, A.z + z0], [x, A.y + y1, A.z + z0], [x, A.y + y1, A.z + z1], [u1, v0, u0, v1]); };
    for (const [z0, z1] of [[-3, -1.55], [-1.45, -.05], [.05, 1.45], [1.55, 3]]) { q(z0, z1, .04, 2.0); q(z0, z1, 2.06, 2.58); } }

  /* light on the floor: the stove, the pendants, the window */
  { const X = v => A.x + v, Z2 = v => A.z + v, Y = A.y;
    const blob = (x, y, z, sx, sz, c, a) => { FXM.set({ kind: 7, a, c }); FXM.quad([X(x - sx / 2), Y + y, Z2(z + sz / 2)], [X(x + sx / 2), Y + y, Z2(z + sz / 2)], [X(x + sx / 2), Y + y, Z2(z - sz / 2)], [X(x - sx / 2), Y + y, Z2(z - sz / 2)], [0, 0, 1, 1]); };
    blob(2.4, .03, -2.2, 2.2, 1.8, [1, .5, .15], 60); blob(1.05, .955, -.1, 2.2, 1.0, [1, .78, .5], 30); blob(1.0, .03, -.6, 2.8, 2.4, [1, .75, .45], 30); blob(W - 1.2, .03, 0, 2.4, 5.4, [.55, .65, 1], 26); }
  const fxBase = FXM.n;

  /* ---------- clutter: a lived-in kitchen, kept clear of the four that matter ---------- */
  Z.at(A.x, A.y, A.z, 0, () => {
    const pl = (c, l = 0) => setPlain(Z, c, l), top = .9;
    /* a rug in front of the stove, a log basket, split logs stacked by the glass */
    { pl(0x7a2a22, L.WEAVE); Z.extrude(roundPoly(2.3, -1.9, 1.6, 1.0, .1, 3), .022, .03, { grad: .9 }); pl(0xc9a23a, L.WEAVE); Z.extrude(roundPoly(2.3, -1.9, 1.3, .7, .08, 3), .03, .034, { grad: .9 }); piece(); }
    { pl(0x6a4a2a, L.WEAVE); Z.lathe(1.95, .02, -2.75, [[.2, 0], [.24, .32], [.22, .33]], 14, {}); for (let k = 0; k < 5; k++) { pl(k % 2 ? 0x7a5634 : 0x8a6440, L.WOOD); Z.at(1.95 + (k - 2) * .07, .3 + (k % 2) * .05, -2.75, .3 * k, () => Z.cyl(0, -.18, 0, .045, .045, .36, 7, {}), Math.PI / 2); } piece(); }
    { for (let r = 0; r < 4; r++) for (let k = 0; k < 4 - (r > 2 ? 1 : 0); k++) { const c = R.pick([0x7a5634, 0x8a6440, 0x6a4a2a]); pl(c, L.WOOD); cylZ(Z, 3.85 + (k - 1.5) * .13 + (r % 2) * .065, .07 + r * .115, -2.75, .06, .5, 7, c); } piece(); }
    /* hooks by the door: jackets and hats, a bench, boots under it */
    { pl(BEAM, L.WOOD); Z.box(-1.3, 1.62, -D + .03, 1.5, .1, .04, {}); pl(IRON); for (let k = 0; k < 5; k++) Z.box(-1.95 + k * .32, 1.62, -D + .09, .02, .02, .08, {});
      for (const [x, c] of [[-1.95, 0x24405a], [-1.31, 0x2f4a3c], [-.67, 0x5a3a6a]]) { pl(c); Z.blob(x, 1.2, -D + .18, .2, { c, sy: 1.9, j: .14 }); }
      pl(0xc9a23a, L.WEAVE); Z.blob(-1.63, 1.58, -D + .12, .1, { c: 0xc9a23a, sy: .8, j: .05 });
      pl(BEAM, L.WOOD); Z.box(-1.3, .42, -D + .22, 1.5, .05, .36, {}); for (const e of [-1, 1]) Z.box(-1.3 + e * .65, .02, -D + .22, .06, .4, .32, {});
      for (const [x, c] of [[-1.85, 0x1a1a20], [-1.6, 0x1a1a20], [-1.0, 0x8a2a22], [-.78, 0x8a2a22]]) { pl(c); Z.box(x, .02, -D + .3, .14, .22, .3, {}); Z.box(x, .02, -D + .38, .14, .08, .14, {}); }
      pl(0xe8e6e0); Z.blob(-1.15, .58, -D + .22, .13, { c: 0xe8e6e0, sy: .8, j: .05 }); piece(); piece(); }
    /* skis and poles leaning on the left wall */
    { for (const [x, c] of [[-.15, 0xff2e88], [.0, 0xff2e88], [.3, 0x16e4f4], [.44, 0x16e4f4]]) { pl(c); Z.at(x, .02, -D + .12, 0, () => Z.box(0, 0, 0, .07, 1.7, .02, {}), -.12); }
      pl(0x9aa0ac); for (const x of [.65, .72]) Z.beam([x, .02, -D + .32], [x - .03, 1.25, -D + .05], .015, {}); piece(); }
    /* the trail poster between the skis and the stove */
    plate(Z, 1.2, 1.6, -D + .02, .5, .7, 0, 'trail', 0, { kind: K.PAPER, em: 30, seed: 0 }); piece();
    /* on the counter: a knife block, a cutting board with bread, jars, a kettle and a pot on the range */
    { pl(BEAM, L.WOOD); Z.rbox(-2.3, top, D - .2, .14, .22, .1, .2, {}); pl(0x1a1a1e); for (let k = 0; k < 4; k++) Z.box(-2.33 + k * .03, top + .2, D - .2, .012, .07, .012, {});
      pl(TOP, L.WOOD); Z.box(-1.6, top, D - .32, .45, .025, .3, {}); pl(0xc8925a); Z.blob(-1.62, top + .07, D - .32, .1, { c: 0xc8925a, sy: .55, j: .06 });
      for (let k = 0; k < 4; k++) { Z.set({ kind: K.PLAIN, c: hex(0xdfe8ec), em: 0, layer: 0 }); Z.lathe(-1.1 + k * .14, top, D - .18, [[.05, 0], [.055, .02], [.055, .16 + (k % 2) * .04], [.04, .18 + (k % 2) * .04], [0, .19 + (k % 2) * .04]], 10, {}); pl([0xe8d8b0, 0x8a5a2a, 0xf2f0e8, 0x3a6a3a][k]); Z.cyl(-1.1 + k * .14, top + .01, D - .18, .047, .047, .11, 10, {}); }
      plate(Z, -1.1, top + .08, D - .235, .08, .05, Math.PI, 'jar', 0, { seed: 0 });
      pl(0xc0302a); Z.lathe(.65, top + .015, D - .48, [[.09, 0], [.1, .04], [.09, .16], [.04, .2], [0, .2]], 14, {}); pl(0x1a1a1e); Z.tube([[.56, top + .08, D - .48], [.5, top + .14, D - .48], [.52, top + .18, D - .48]], .012, 6, 5, {}); Z.box(.65, top + .2, D - .48, .03, .04, .03, {});
      pl(0x2a2a30); Z.cyl(1.05, top + .015, D - .2, .13, .13, .14, 16, {}); pl(0x1a1a1e); Z.box(1.24, top + .11, D - .2, .14, .02, .03, {}); piece(); piece(); }
    /* on the open shelf: plates and cups; on the tiles a towel on the oven rail */
    { for (let k = 0; k < 4; k++) { pl(0xf2f0e8); Z.cyl(-.95 + k * .025, 1.665, D - .15, .1, .1, .01, 14, {}); } for (let k = 0; k < 3; k++) { pl([0x24405a, 0xc9a23a, 0x2f4a3c][k]); Z.lathe(-.5 + k * .13, 1.665, D - .14, [[.04, 0], [.045, .08], [0, .08]], 10, {}); }
      pl(0xe8e0c8, L.WEAVE); Z.box(.85, .58, D - .67, .22, .2, .012, {}); pl(0xc0302a); Z.box(.85, .66, D - .676, .22, .02, .004, {}); piece(); }
    /* on the island: a bowl of oranges, mugs, a candle; a radio on the counter */
    { pl(0x24405a); Z.lathe(1.15, .925, .25, [[.0, 0], [.1, .005], [.16, .08], [.17, .09], [0, .02]], 16, {}); for (let k = 0; k < 6; k++) { pl(0xf08a1a); Z.blob(1.15 + Math.cos(k * 1.1) * .07, 1.0 + (k > 3 ? .05 : 0), .25 + Math.sin(k * 1.1) * .07, .045, { c: 0xf08a1a, sy: 1, j: .03 }); }
      for (const [x, z, c] of [[.95, -.4, 0xe8e0c8], [1.25, -.45, 0x2f4a3c]]) { pl(c); Z.lathe(x, .925, z, [[.04, 0], [.042, .1], [0, .1]], 12, {}); Z.tube([[x + .04, .96, z], [x + .07, .985, z], [x + .04, 1.01, z]], .008, 6, 4, {}); }
      pl(0xe8e0c8); Z.cyl(.15, .925, .25, .035, .035, .1, 10, {}); Z.set({ kind: K.PLAIN, c: hex(0xffd080), em: 255, layer: 0 }); Z.cyl(.15, 1.025, .25, .006, .004, .02, 6, {}); G(.15, 1.06, .25, [1, .75, .35], .25, 0, zGlows);
      pl(0x5a3a26, L.WOOD); Z.box(2.2, top, D - .3, .3, .18, .14, {}); pl(0xd8d4cc); Z.cyl(2.13, top + .09, D - .372, .04, .04, .004, 12, {}); pl(0x1a1a1e); Z.box(2.27, top + .07, D - .372, .1, .08, .004, {}); piece(); piece(); }
    /* a fern by the glass, a little tree in a pot by the fridge */
    { pl(0x7a4a2a); Z.lathe(4.0, .02, 2.55, [[.16, 0], [.2, .3], [.21, .32], [0, .3]], 12, {}); pl(0x2a6a3a); for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; Z.at(4.0, .34, 2.55, a, () => Z.box(0, 0, .2, .07, .02, .4, {}), .5); } piece();
      pl(0x3a3a40); Z.lathe(3.85, .02, -1.0, [[.14, 0], [.17, .3], [0, .3]], 12, {}); pl(0x1e4a30); Z.blob(3.85, .9, -1.0, .32, { c: 0x1e4a30, sy: 1.6, j: .22 }); pl(BEAM); Z.box(3.85, .3, -1.0, .03, .45, .03, {}); piece(); }
    /* books on a shelf over the door, a string of lights along the ridge */
    { pl(BEAM, L.WOOD); Z.box(-2.8, 2.28, -D + .14, 1.3, .04, .26, {}); plate(Z, -2.8, 2.42, -D + .2, 1.2, .24, 0, 'spines', 0, { kind: K.PAPER, em: 20, seed: 0 }); piece();
      Z.set({ kind: K.PLAIN, c: hex(0xffd8a0), em: 255, layer: 0 }); for (let k = 0; k < 16; k++) { const x = -W + .4 + k * (A.w - .8) / 15, y = RH - .45 - Math.abs(Math.sin(k * .9)) * .08; Z.cyl(x, y, .14, .022, .022, .04, 6, {}); G(x, y, .14, [1, .8, .5], .22, 0, zGlows); } piece(); }
  });

  const lights = [
    [...w(1.05, 1.6, -.1), 0xffd9b0, 7, .75],
    [...w(2.4, .55, -2.3), 0xff7a2a, 6, .9],
    [...w(W + 1.4, 1.9, 0), 0x9ab4ff, 9, .45],
    [...w(-1.85, 1.45, D - .45), 0xffc890, 3.5, .5],
    [...w(1.95, 1.45, D - .45), 0xffc890, 3, .45],
    [...w(-2.8, 2.0, -D + .6), 0xffc890, 4, .35],
    [...w(0, RH - .6, 0), 0xffd8a0, 7, .25],
    [...w(-3.6, 1.4, 1.6), 0xffb88a, 5, .3],
  ];
  const hot = [
    { key: 'fridge', label: 'LIST', hotkey: 'E', line: 18, sheet: 'cList', p: w(3.04, 1.3, D - .74) },
    { key: 'book', label: 'MEALS', hotkey: 'R', line: 14, sheet: 'cMeals', p: w(.5, 1.22, -.12) },
    { key: 'blender', label: 'SHAKES', hotkey: 'F', line: 26, sheet: 'cShakes', p: w(1.6, 1.38, .15) },
    { key: 'ticket', label: 'CARDIO', hotkey: 'G', line: 12, sheet: 'cCardio', p: w(1.69, .5, -1.29) },
  ];
  return {
    geom: M.geom(), clutterGeom: Z.geom(), glassGeom: GL.geom(), fxGeom: FXM.geom(), lights, hot, glows: [...glows, ...zGlows], glowsPlain: glows, clutterLight: 6, fxPlain: fxBase, pieces: PIECES, tris: M.n / 3, clutterTris: Z.n / 3, atlas: tex, day: new Date().toDateString(),
    paint, setDoor() {},
  };
}

/* ---------- the castle: a stone study hall in the east end, School in one room ---------- */
/* Upper floor of the castle's main block. Its +X wall is the block's east face (x = -178): a tall pointed window on the
   skyline across the water, a narrow lancet with a window seat to the left, a built-in bookcase to the right */
const CS = { x: -183, y: 19, z: 292, w: 10, d: 7, h: 4.4 };
/* what the folder, the board, the shelf and the hourglass show, so they're only repainted when it changes */
const castleSig = X => JSON.stringify([X.set, X.over.map(t => t.id + t.title + t.date), X.week.map(t => t.id + t.title + t.date), X.later.slice(0, 4).map(t => t.id + t.title + t.date), X.course, X.upNext, X.courses.map(c => c.id + c.code + c.name), X.res && [X.res.say, X.res.list.length, X.res.list.filter(x => x.done).length], Math.round(X.hours * 4), X.goal, X.clock.on]);
let CS_SIG = '';
function castleAtlas(X) {
  const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'), C = {}, cells = {};
  let cx = 0, cy = 0, rowH = 0;
  /* k: each cell is drawn at its own size, then scaled down to fit the sheet */
  const KS = { due: .82, board: .82, sand: .8, shelf: .85, spines: .9, spines2: .9, banner: .7, map: .75, screen: .8, post: .8, stain: .62 };
  const cell = (name, w0, h0, fn, k = KS[name] || 1) => { const w = Math.ceil(w0 * k), h = Math.ceil(h0 * k); if (cx + w > S) { cx = 0; cy += rowH + 2; rowH = 0; } if (cy + h > S) console.error('castle atlas overflow', name); cells[name] = { px: cx, py: cy, w, h, w0, h0, k, fn }; C[name] = [cx / S + .0008, 1 - (cy + h) / S + .0008, (cx + w) / S - .0008, 1 - cy / S - .0008]; cx += w + 2; rowH = Math.max(rowH, h); };
  const draw = (name, t) => { const c = cells[name]; x.save(); x.beginPath(); x.rect(c.px, c.py, c.w, c.h); x.clip(); x.translate(c.px, c.py); x.clearRect(0, 0, c.w, c.h); x.scale(c.k, c.k); c.fn(x, c.w0, c.h0, t); x.restore(); };
  const fit = (x, s, max) => { s = String(s); if (x.measureText(s).width <= max) return s; while (s.length > 3 && x.measureText(s + '…').width > max) s = s.slice(0, -1); return s + '…'; };
  const INK = '#22263a', PEN = '#b8322a', GRN = '#1f7a4a';
  /* the folder on the desk: what's due, in his hand */
  cell('due', 420, 560, (x, w, h, X) => {
    x.fillStyle = '#f3eedf'; x.fillRect(0, 0, w, h); x.fillStyle = '#2f6a4a'; x.fillRect(0, 0, w, 30);
    x.strokeStyle = 'rgba(70,110,170,.22)'; x.lineWidth = 2; for (let y = 110; y < h; y += 44) { x.beginPath(); x.moveTo(0, y + 16); x.lineTo(w, y + 16); x.stroke(); }
    x.textBaseline = 'middle'; x.fillStyle = INK; x.font = `800 48px ${FONT_DISP}`; x.fillText('DUE', 24, 70);
    const L = [...X.over.map(t => ({ ...t, k: 'o' })), ...X.week, ...X.later].slice(0, 9);
    x.fillStyle = PEN; x.font = `700 26px ${FONT_EN}`; x.textAlign = 'right'; x.fillText(X.over.length ? `${X.over.length} LATE` : X.next ? X.next.due : '', w - 22, 72); x.textAlign = 'left';
    if (!X.set) { x.fillStyle = INK; x.font = `600 30px ${FONT_EN}`; x.fillText('SET UP SCHOOL', 24, 140); x.fillText('ON THE SHELF', 24, 182); return; }
    if (!L.length) { x.fillStyle = INK; x.font = `600 30px ${FONT_EN}`; x.fillText('NOTHING DUE', 24, 140); return; }
    L.forEach((t, k) => {
      const y = 122 + k * 44; x.fillStyle = t.late ? PEN : GRN; x.font = `800 22px ${FONT_EN}`; x.fillText(t.day.split(' ')[0] + ' ' + t.day.split(' ')[1], 24, y);
      x.fillStyle = t.late ? PEN : INK; x.font = `600 27px ${FONT_EN}`; x.fillText(fit(x, unesc(t.title), w - 132 - (t.course ? 80 : 0)), 108, y);
      if (t.course) { x.fillStyle = GRN; x.font = `700 20px ${FONT_EN}`; x.textAlign = 'right'; x.fillText(fit(x, unesc(t.course), 76), w - 18, y + 1); x.textAlign = 'left'; }
    });
  });
  /* the noticeboard: cork, the course card, the week, the residency */
  cell('board', 560, 420, (x, w, h, X) => {
    x.fillStyle = '#a8784a'; x.fillRect(0, 0, w, h); const r = rng(77); for (let i = 0; i < 900; i++) { x.fillStyle = r() < .5 ? 'rgba(80,50,25,.35)' : 'rgba(220,180,120,.3)'; x.fillRect(r() * w, r() * h, 2, 2); }
    const card = (cx0, cy0, cw, ch, bg, rot, fn, pin) => { x.save(); x.translate(cx0 + cw / 2, cy0 + ch / 2); x.rotate(rot); x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(-cw / 2 + 5, -ch / 2 + 6, cw, ch); x.fillStyle = bg; x.fillRect(-cw / 2, -ch / 2, cw, ch); x.translate(-cw / 2, -ch / 2); x.textBaseline = 'middle'; fn(cw, ch); x.fillStyle = pin; x.beginPath(); x.arc(cw / 2, 12, 8, 0, TAU); x.fill(); x.restore(); };
    card(18, 22, 300, 220, '#f4efe2', -.025, (cw, ch) => {
      x.fillStyle = INK; x.font = `700 20px ${FONT_EN}`; x.fillText('THIS COURSE', 18, 40);
      if (X.course) { x.font = `900 46px ${FONT_DISP}`; x.fillText(fit(x, unesc(X.course.code || X.course.name), cw - 30), 18, 92); x.font = `600 22px ${FONT_EN}`; x.fillText(fit(x, unesc(X.course.code ? X.course.name : ''), cw - 30), 18, 128);
        x.fillStyle = GRN; x.font = `800 34px ${FONT_DISP}`; x.fillText(`WEEK ${X.course.n}/${X.course.of}`, 18, 172); x.fillStyle = INK; x.font = `600 20px ${FONT_EN}`; x.fillText(`ENDS ${X.course.end}`, 18, 202); }
      else { x.font = `700 30px ${FONT_DISP}`; x.fillText(X.upNext ? fit(x, unesc(X.upNext.code || X.upNext.name), cw - 30) : 'NONE YET', 18, 96); x.font = `600 22px ${FONT_EN}`; x.fillText(X.upNext ? `STARTS ${X.upNext.start}` : 'ADD YOURS ON THE SHELF', 18, 134); }
    }, '#ff2e88');
    card(336, 30, 200, 150, '#ffe680', .04, (cw, ch) => { x.fillStyle = INK; x.font = `700 18px ${FONT_EN}`; x.fillText('THIS WEEK', 16, 40); x.font = `900 44px ${FONT_DISP}`; x.fillText(fh(X.hours), 16, 90); x.font = `700 20px ${FONT_EN}`; x.fillText(`OF ${X.goal} HOURS`, 16, 128); }, '#16e4f4');
    if (X.res) card(330, 210, 210, 180, '#dfe9f2', -.03, (cw, ch) => { x.fillStyle = INK; x.font = `700 18px ${FONT_EN}`; x.fillText('RESIDENCY', 16, 40); x.font = `900 34px ${FONT_DISP}`; x.fillText(X.res.say ? fit(x, unesc(X.res.say), cw - 26) : 'NO DATES', 16, 90); x.font = `600 20px ${FONT_EN}`; const n = X.res.list.length; x.fillText(n ? `${X.res.list.filter(y => y.done).length}/${n} PACKED` : 'NO LIST YET', 16, 136); }, '#f6ee1c');
    card(40, 262, 250, 130, '#f4efe2', .03, (cw, ch) => { x.fillStyle = INK; x.font = `700 18px ${FONT_EN}`; x.fillText('NEXT UP', 16, 38); x.font = `700 26px ${FONT_EN}`; x.fillText(X.next ? fit(x, unesc(X.next.title), cw - 30) : 'NOTHING DUE', 16, 78); x.fillStyle = PEN; x.font = `700 20px ${FONT_EN}`; x.fillText(X.next ? X.next.due : '', 16, 110); }, '#5be38a');
  });
  /* the hourglass: its glass and sand, a frame of its own in brass around it. The sand runs while the study clock does */
  cell('sand', 120, 220, (x, w, h, X) => {
    const u = X.clock.on ? (X.clock.ms / 36e5) % 1 : X.hours > 0 ? 1 : .0, cxm = w / 2, top = 12, mid = h / 2, bot = h - 12, bw = 48;
    const bulb = (y0, y1) => { x.beginPath(); x.moveTo(cxm - bw, y0); x.bezierCurveTo(cxm - bw, (y0 + y1) / 2, cxm - 6, y1 - 20, cxm - 5, y1); x.lineTo(cxm + 5, y1); x.bezierCurveTo(cxm + 6, y1 - 20, cxm + bw, (y0 + y1) / 2, cxm + bw, y0); x.closePath(); };
    x.fillStyle = 'rgba(200,225,240,.28)'; x.save(); bulb(top, mid); x.fill(); x.restore(); x.save(); x.translate(0, h); x.scale(1, -1); bulb(top, mid); x.fill(); x.restore();
    x.fillStyle = '#e8c27a';
    /* sand left on top: a mound shrinking toward the neck; below, a heap growing from the bottom */
    const tl = (1 - u) * (mid - top - 20); if (tl > 1) { x.save(); bulb(top, mid); x.clip(); x.fillRect(0, mid - 20 - tl, w, tl + 20); x.restore(); }
    const bl = u * (mid - top - 26); if (bl > 1) { x.save(); x.translate(0, h); x.scale(1, -1); bulb(top, mid); x.clip(); x.beginPath(); x.moveTo(0, top - 2); x.lineTo(w, top - 2); x.lineTo(w, top + bl * .7); x.quadraticCurveTo(cxm, top + bl * 1.5, 0, top + bl * .7); x.fill(); x.restore(); }
    if (X.clock.on) { x.fillStyle = '#e8c27a'; x.fillRect(cxm - 1.5, mid - 4, 3, bot - mid - bl * 1.1); }
    x.strokeStyle = 'rgba(230,245,255,.75)'; x.lineWidth = 2.5; x.save(); bulb(top, mid); x.stroke(); x.restore(); x.save(); x.translate(0, h); x.scale(1, -1); bulb(top, mid); x.stroke(); x.restore();
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 3; x.beginPath(); x.moveTo(cxm - bw + 10, top + 14); x.quadraticCurveTo(cxm - bw + 6, top + 40, cxm - 24, mid - 40); x.stroke();
  });
  /* the lancet's stained glass: lead lines, quarries in deep blues and greens, a peacock's eye in the middle, the pointed head */
  cell('stain', 120, 300, (x, w, h) => {
    x.fillStyle = '#1a1612'; x.fillRect(0, 0, w, h);
    const head = h * .22, clip = () => { x.beginPath(); x.moveTo(0, h); x.lineTo(0, head); x.quadraticCurveTo(0, 6, w / 2, 0); x.quadraticCurveTo(w, 6, w, head); x.lineTo(w, h); x.closePath(); };
    x.save(); clip(); x.clip(); const r = rng(31), cs = ['#1f4fa0', '#14306a', '#1f7a5a', '#2a9a7a', '#c9a23a', '#5a2a7a', '#2a5ab0'];
    for (let j = -1; j < 16; j++) for (let i = -1; i < 5; i++) { const cx0 = i * 30 + (j % 2) * 15, cy0 = j * 22; x.fillStyle = cs[Math.floor(r() * cs.length)]; x.beginPath(); x.moveTo(cx0, cy0 - 11); x.lineTo(cx0 + 15, cy0); x.lineTo(cx0, cy0 + 11); x.lineTo(cx0 - 15, cy0); x.closePath(); x.fill(); x.strokeStyle = '#141210'; x.lineWidth = 2.5; x.stroke(); }
    const ey = h * .55; x.fillStyle = '#e8c060'; x.beginPath(); x.ellipse(w / 2, ey, 30, 42, 0, 0, TAU); x.fill(); x.fillStyle = '#1f8a6a'; x.beginPath(); x.ellipse(w / 2, ey, 21, 30, 0, 0, TAU); x.fill(); x.fillStyle = '#1f3fa0'; x.beginPath(); x.ellipse(w / 2, ey + 3, 11, 16, 0, 0, TAU); x.fill(); x.strokeStyle = '#141210'; x.lineWidth = 3; for (const [a, b] of [[30, 42], [21, 30], [11, 16]]) { x.beginPath(); x.ellipse(w / 2, ey, a, b, 0, 0, TAU); x.stroke(); }
    x.restore(); x.strokeStyle = '#141210'; x.lineWidth = 6; clip(); x.stroke();
  });
  /* the course shelf: one spine a course, his codes on them, the current one banded in gold */
  cell('shelf', 600, 128, (x, w, h, X) => {
    const L = X.courses.slice(0, 10), cs = ['#24405a', '#7a2a22', '#2f4a3c', '#5a3a6a', '#3a3a50', '#6a4a2a'];
    if (!L.length) { for (let i = 0; i < 10; i++) { x.fillStyle = cs[i % cs.length]; x.fillRect(i * 60, 8, 56, h - 8); } x.fillStyle = '#efe6d0'; x.fillRect(150, 34, 300, 60); x.fillStyle = INK; x.font = `800 28px ${FONT_EN}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(X.set ? 'ADD COURSES' : 'SET UP SCHOOL', 300, 64); x.textAlign = 'left'; return; }
    const sw = Math.min(90, Math.floor(w / L.length));
    L.forEach((c, i) => { const sx = i * sw; x.fillStyle = cs[i % cs.length]; x.fillRect(sx, c.now ? 0 : 10, sw - 4, h - (c.now ? 0 : 10)); x.fillStyle = c.now ? '#e8c060' : 'rgba(232,208,150,.6)'; x.fillRect(sx, 22, sw - 4, 5); x.fillRect(sx, h - 26, sw - 4, 5);
      x.save(); x.translate(sx + (sw - 4) / 2, h / 2 + 4); x.rotate(-Math.PI / 2); x.fillStyle = c.past ? 'rgba(240,230,210,.55)' : '#f2ead6'; x.font = `800 ${Math.min(26, sw * .42)}px ${FONT_EN}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(fit(x, unesc(c.code || c.name), h - 52), 0, 0); x.restore(); });
  });
  /* library spines, two runs */
  for (const [n, sd] of [['spines', 5], ['spines2', 9]]) cell(n, 512, 72, (x, w, h) => { const r = rng(sd), cs = ['#7a2a22', '#24405a', '#c9a23a', '#2f4a3c', '#e8e0d0', '#5a3a6a', '#a8442a', '#16121c', '#3a5a6a']; let px = 0; while (px < w) { const bw = 9 + Math.floor(r() * 12), bh = h - Math.floor(r() * 16); x.fillStyle = cs[Math.floor(r() * cs.length)]; x.fillRect(px, h - bh, bw - 1, bh); x.fillStyle = 'rgba(255,236,190,.45)'; x.fillRect(px + 2, h - bh + 8, bw - 5, 2); x.fillRect(px + 2, h - 12, bw - 5, 2); px += bw; } });
  /* a made-up banner: a hall's name and a peacock */
  cell('banner', 200, 420, (x, w, h) => {
    x.fillStyle = '#2a4a3a'; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w, h); x.lineTo(w / 2, h - 50); x.lineTo(0, h); x.fill();
    x.strokeStyle = '#c9a23a'; x.lineWidth = 6; x.strokeRect(14, 14, w - 28, h - 110);
    x.fillStyle = '#c9a23a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `900 30px ${FONT_DISP}`; x.fillText('ARDEN', w / 2, 60); x.fillText('VALE', w / 2, 96);
    x.strokeStyle = '#16e4f4'; x.lineWidth = 4; for (let k = 0; k < 7; k++) { const a = -1.2 + k * .4; x.beginPath(); x.moveTo(w / 2, 280); x.quadraticCurveTo(w / 2 + Math.sin(a) * 40, 280 - Math.cos(a) * 60, w / 2 + Math.sin(a) * 70, 280 - Math.cos(a) * 110); x.stroke(); x.fillStyle = '#16e4f4'; x.beginPath(); x.arc(w / 2 + Math.sin(a) * 70, 280 - Math.cos(a) * 110, 9, 0, TAU); x.fill(); x.fillStyle = '#c9a23a'; x.beginPath(); x.arc(w / 2 + Math.sin(a) * 70, 280 - Math.cos(a) * 110, 4, 0, TAU); x.fill(); }
    x.fillStyle = '#1f5fa0'; x.beginPath(); x.ellipse(w / 2, 292, 16, 26, 0, 0, TAU); x.fill(); x.textAlign = 'left';
  });
  /* postcards and a map for the travel corner */
  cell('post', 240, 90, (x, w, h) => { for (const [px, bg, sea] of [[0, '#f2e6c8', '#2a8ab0'], [122, '#f4efe2', '#d06a3a']]) { x.fillStyle = bg; x.fillRect(px, 0, 118, h); x.fillStyle = sea; x.fillRect(px + 8, 8, 60, h - 16); x.fillStyle = '#22263a'; for (let k = 0; k < 4; k++) x.fillRect(px + 76, 20 + k * 14, 34, 2); x.fillStyle = PEN; x.fillRect(px + 96, 8, 14, 14); } });
  cell('map', 300, 200, (x, w, h) => { x.fillStyle = '#e9dcb8'; x.fillRect(0, 0, w, h); x.fillStyle = '#8ab8c8'; x.fillRect(0, 0, w, h); x.fillStyle = '#e2d4a8'; x.beginPath(); x.moveTo(40, 20); x.bezierCurveTo(120, 10, 200, 60, 180, 120); x.bezierCurveTo(170, 170, 90, 190, 50, 150); x.bezierCurveTo(10, 110, 0, 40, 40, 20); x.fill(); x.beginPath(); x.ellipse(240, 140, 40, 28, .4, 0, TAU); x.fill(); x.strokeStyle = PEN; x.lineWidth = 3; x.setLineDash([6, 6]); x.beginPath(); x.moveTo(90, 90); x.quadraticCurveTo(170, 40, 240, 140); x.stroke(); x.setLineDash([]); x.strokeStyle = 'rgba(60,40,20,.5)'; x.strokeRect(4, 4, w - 8, h - 8); });
  /* the laptop's screen: a course site, made up */
  cell('screen', 256, 160, (x, w, h, X) => { x.fillStyle = '#f2f4f6'; x.fillRect(0, 0, w, h); x.fillStyle = '#1f5a46'; x.fillRect(0, 0, w, 26); x.fillStyle = '#fff'; x.font = `800 15px ${FONT_EN}`; x.textBaseline = 'middle'; x.fillText('COURSE SPACE', 10, 13); x.fillStyle = '#22263a'; x.font = `700 18px ${FONT_EN}`; x.fillText(X.course ? fit(x, unesc(X.course.code || X.course.name), w - 20) : 'WELCOME', 10, 48); x.fillStyle = '#9aa4b0'; for (let k = 0; k < 6; k++) x.fillRect(10, 70 + k * 14, 130 + (k * 37) % 90, 6); x.fillStyle = '#2f9a6a'; x.fillRect(170, 70, 70, 60); });
  for (const n of Object.keys(cells)) draw(n, X);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.anisotropy = 8; tex.flipY = true; tex.premultiplyAlpha = false;
  /* a change in the app repaints just these; the sand on its own, while the clock runs */
  const paint = X => { for (const n of ['due', 'board', 'shelf', 'screen', 'sand']) draw(n, X); tex.needsUpdate = true; };
  const sand = X => { draw('sand', X); tex.needsUpdate = true; };
  return { tex, C, paint, sand };
}

function buildCastle() {
  const A = CS, W = A.w / 2, D = A.d / 2, H = A.h, X = APP.school();
  const { tex, C, paint, sand } = castleAtlas(X); CS_SIG = castleSig(X);
  const M = new MB(36000), Z = new MB(26000), FXM = new MB(1200), GL = new MB(96), R = rng(9310);
  const glows = [], zGlows = [], w = (x, y, z) => [A.x + x, A.y + y, A.z + z];
  const G = (x, y, z, c, s, a = 0, list = glows) => { const k = typeof c === 'number' ? hex(c) : c; list.push({ x: A.x + x, y: A.y + y, z: A.z + z, r: k[0], g: k[1], b: k[2], s, a }); };
  const piece = () => PIECES++;
  const plate = (B, x, y, z, pw, ph, ry, cell, rx = 0, o = {}) => B.at(x, y, z, ry, () => B.plate(0, 0, 0, pw, ph, 0, C[cell], { kind: K.PAPER, em: 0, c: [1, 1, 1], ...o }), rx);
  const brass = (B, c = 0xc9a24e) => B.set({ kind: K.BRASS, em: 0, layer: 0, c });
  const line = (B, x, y, z, lw, lh, ld, c, em = 200) => { setPlain(B, c, 0, em); B.box(x, y, z, lw, lh, ld, { c }); B.set({ em: 0 }); };
  const STONE = [0x8a8172, 0x80776a, 0x938a7a, 0x7a7266], DARK = 0x4a4438, OAK = 0x5a3a22, OAK2 = 0x6a4628, BEAM = 0x2e2018, IRON = 0x1a1a1e;
  /* the big window: z -1.3..1.3, sill .75, square to 2.95, a pointed head to 3.95. The lancet: z -3.05..-2.05, sill .55, to 2.5, head to 3.05 */
  const BW = { z0: -1.3, z1: 1.3, y0: .75, y1: 2.95, y2: 3.95 }, LW = { z0: -3.05, z1: -2.05, y0: .55, y1: 2.5, y2: 3.05 };
  const archHalf = (o, y) => { const hw = (o.z1 - o.z0) / 2; if (y <= o.y1) return hw; if (y >= o.y2) return 0; const t = (y - o.y1) / (o.y2 - o.y1); return hw * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - t * .25); };
  const inWin = (o, z, y) => y > o.y0 && y < o.y2 && Math.abs(z - (o.z0 + o.z1) / 2) < archHalf(o, y);
  const CASE = { z0: 1.6, z1: D };   /* the built-in bookcase takes the window wall from here */
  /* the castle wall is .55 thick: its outer face is the room's +X end (the facade, where the glass is), its inner face WI */
  const WI = W - .55;

  M.at(A.x, A.y, A.z, 0, () => {
    /* floor: oak boards across the hall, each its own number so the ink draws the seams */
    for (let i = 0; i < 26; i++) { const x0 = -W + i * (A.w / 26), x1 = x0 + A.w / 26; let z0 = -D, k = i; while (z0 < D) { const len = Math.min(D - z0, 1.4 + ((k * 31) % 6) * .4); setPlain(M, [0x5e3c26, 0x684430, 0x56381f][k % 3], L.WOOD); M.id = 20 + (i * 11 + k * 7) % 70; M.quad([x0, .02, z0], [x0, .02, z0 + len], [x1, .02, z0 + len], [x1, .02, z0], [0, 0, 1, 1]); z0 += len; k++; } }
    /* stone walls: courses of ashlar, every block its own number. skip(a, b, y0, y1) cuts openings */
    const ashlar = (len, h0, h1, k0, cutAt) => { for (let j = 0, y = h0; y < h1 - .01; j++, y += .36) { const y1 = Math.min(h1, y + .36); let a = -len / 2 + ((j % 2) ? -.3 : 0), k = j * 3 + k0; while (a < len / 2 - .01) { const b = Math.min(len / 2, a + .7 + ((k * 37) % 5) * .14), a0 = Math.max(a, -len / 2);
      const seg = cutAt ? cutAt(a0, b, y, y1) : [[a0, b]]; for (const [p, q] of seg) if (q - p > .005) { setPlain(M, STONE[k % 4], L.BRICK); M.id = M.nid(); M.quad([p, y, 0], [q, y, 0], [q, y1, 0], [p, y1, 0], [0, 0, 1, 1], .86, .86, 1, 1); } a = b; k++; } } };
    /* the door at the back of the left wall */
    const DOOR = [-4.2, -3.1], DH = 2.5;
    M.at(0, 0, -D, 0, () => ashlar(A.w, 0, H, 0, (a, b, y0, y1) => y0 >= DH + .3 || b <= DOOR[0] - .1 || a >= DOOR[1] + .1 ? [[a, b]] : [[a, Math.min(b, DOOR[0] - .1)], [Math.max(a, DOOR[1] + .1), b]].filter(s => s[1] > s[0])));
    M.at(0, 0, D, Math.PI, () => ashlar(A.w, 0, H, 2));
    M.at(-W, 0, 0, Math.PI / 2, () => ashlar(A.d, 0, H, 1));
    /* the window wall's inner face (in this frame local x is world z): the openings and the bookcase are left out */
    M.at(WI, 0, 0, -Math.PI / 2, () => ashlar(A.d, 0, H, 3, (a, b, y0, y1) => {
      const cuts = []; for (const o of [BW, LW]) { if (y1 <= o.y0 || y0 >= o.y2) continue; const ym = (y0 + y1) / 2, hw = Math.max(archHalf(o, Math.max(y0, o.y0 + .001)), archHalf(o, Math.min(ym, o.y2 - .001))) + .02, zc = (o.z0 + o.z1) / 2; cuts.push([zc - hw, zc + hw]); }
      cuts.push([CASE.z0, CASE.z1 + .01]);
      let out = [[a, b]]; for (const [p, q] of cuts) out = out.flatMap(([s, e]) => e <= p || s >= q ? [[s, e]] : [[s, Math.min(e, p)], [Math.max(s, q), e]].filter(v => v[1] - v[0] > .005)); return out; }));
    /* its outer face round the big window's pointed head, only inside the hole's rectangle so it never fights the facade */
    { const z0 = BW.z0, z1 = BW.z1, ya = BW.y0, yb = BW.y2, N = 34; setPlain(M, 0x4e4252);
      for (let i = 0; i < N; i++) { const y0 = ya + (yb - ya) * i / N, y1 = ya + (yb - ya) * (i + 1) / N, ym = (y0 + y1) / 2; let out = [[z0, z1]];
        for (const o of [BW]) { if (ym <= o.y0 || ym >= o.y2) continue; const zc = (o.z0 + o.z1) / 2, hw = archHalf(o, ym); out = out.flatMap(([s0, e]) => e <= zc - hw || s0 >= zc + hw ? [[s0, e]] : [[s0, Math.min(e, zc - hw)], [Math.max(s0, zc + hw), e]].filter(v => v[1] - v[0] > .004)); }
        for (const [p, q] of out) { M.id = 5; M.quad([W, y0, q], [W, y0, p], [W, y1, p], [W, y1, q]); } } }
    piece(); piece();
    /* the reveals: the wall is .55 deep; stone faces round each opening, stepped up the pointed head */
    for (const o of [BW, LW]) { const zc = (o.z0 + o.z1) / 2, dep = W - WI; setPlain(M, 0x8e8576, L.BRICK);
      M.box(WI + dep / 2, o.y0 - .08, zc, dep, .08, o.z1 - o.z0 + .1, { id: M.nid() });
      const N = 12; for (let i = 0; i < N; i++) { const ya = o.y0 + (o.y2 - o.y0) * i / N, yb = o.y0 + (o.y2 - o.y0) * (i + 1) / N, ha = archHalf(o, ya), hb = archHalf(o, yb); for (const s of [-1, 1]) { M.id = M.nid(); const za = zc + s * ha, zb = zc + s * hb; if (s < 0) M.quad([WI, ya, za], [W, ya, za], [W, yb, zb], [WI, yb, zb]); else M.quad([W, ya, za], [WI, ya, za], [WI, yb, zb], [W, yb, zb]); } } }
    /* the window seat in the lancet's reveal, and a cushion on it */
    setPlain(M, 0x8e8576, L.BRICK); M.box(WI + .17, 0, (LW.z0 + LW.z1) / 2, .7, LW.y0, LW.z1 - LW.z0 + .1, { id: M.nid() });
    setPlain(M, 0x2a4a3a, L.WEAVE); M.rbox(WI + .1, LW.y0, (LW.z0 + LW.z1) / 2, .62, .1, LW.z1 - LW.z0 - .06, 0, { id: M.nid() }); piece();
    /* tracery: the big window's two mullions and transom, its head traced in stone; leading in the lancet */
    { const xm = W - .18; setPlain(M, 0x9a917f, L.BRICK);
      for (const z of [-.43, .43]) M.box(xm, BW.y0, z, .12, archHalf(BW, 3.5) > Math.abs(z) ? 3.5 - BW.y0 : BW.y1 - BW.y0 + .3, .09, { id: M.nid() });
      M.box(xm, 2.05, 0, .12, .09, BW.z1 - BW.z0, { id: M.nid() });
      const arc = (o, zc, off) => { const P = []; for (let i = 0; i <= 10; i++) { const y = o.y1 + (o.y2 - o.y1) * i / 10; P.push([y, zc + off * archHalf(o, y)]); } return P; };
      for (const s of [-1, 1]) { const P = arc(BW, 0, s * .98); for (let i = 0; i < P.length - 1; i++) M.beam([xm, P[i][0], P[i][1]], [xm, P[i + 1][0], P[i + 1][1]], .07, { id: M.nid() }); }
      /* the lancet is stained glass: deep quarries and a peacock's eye, lit from outside */
      M.at(W - .08, (LW.y0 + LW.y2) / 2, (LW.z0 + LW.z1) / 2, -Math.PI / 2, () => M.plate(0, 0, 0, LW.z1 - LW.z0 + .02, LW.y2 - LW.y0 + .02, 0, C.stain, { kind: K.SIGN, em: 110, id: 249, seed: 0 })); G(W - .3, (LW.y0 + LW.y1) / 2, (LW.z0 + LW.z1) / 2, [.35, .6, 1], .5); piece(); }
    /* the ceiling: boards between heavy beams on stone corbels */
    for (let i = 0; i < 12; i++) { const x0 = -W + i * A.w / 12, x1 = x0 + A.w / 12; setPlain(M, i % 2 ? 0x3a2a1e : 0x42301f, L.WOOD); M.id = M.nid(); M.quad([x0, H, D], [x1, H, D], [x1, H, -D], [x0, H, -D], [0, 0, 1, 1]); }
    for (let i = 0; i < 5; i++) { const x = -W + 1 + i * 2; setPlain(M, BEAM, L.WOOD); M.box(x, H - .32, 0, .3, .32, A.d, { id: M.nid() }); setPlain(M, 0x8e8576, L.BRICK); for (const s of [-1, 1]) M.box(x, H - .62, s * (D - .14), .34, .3, .28, { id: M.nid() }); }
    setPlain(M, BEAM, L.WOOD); for (let k = 0; k < 3; k++) M.box(0, H - .5, -D + 1 + k * (A.d - 2) / 2, A.w, .14, .14, { id: M.nid() }); piece();

    /* the library: the back wall shelved floor to ceiling, books on every shelf */
    { const x = -W + .2; setPlain(M, OAK, L.WOOD); M.box(x, 0, 0, .4, 3.7, A.d - .3, { id: M.nid() });
      for (let k = 0; k < 7; k++) { const y = .1 + k * .52; setPlain(M, OAK2, L.WOOD); M.box(x + .2, y, 0, .06, .04, A.d - .3, { id: M.nid() }); if (k < 6) for (let s = 0; s < 3; s++) plate(M, x + .21, y + .27, -2.2 + s * 2.2, 2.1, .46, Math.PI / 2, (k + s) % 2 ? 'spines' : 'spines2', 0, { em: 12, seed: 0 }); }
      setPlain(M, OAK, L.WOOD); for (const z of [-D + .2, -1.1, 1.1, D - .2]) M.box(x + .2, 0, z, .08, 3.7, .08, { id: M.nid() }); M.box(x + .1, 3.7, 0, .5, .12, A.d - .2, { id: M.nid() });
      /* a library ladder on its rail */
      setPlain(M, IRON); M.box(x + .45, 3.2, 0, .03, .03, A.d - .5, {}); setPlain(M, OAK2, L.WOOD); for (const s of [-.22, .22]) M.beam([x + 1.0, 0, .6 + s], [x + .45, 3.2, .6 + s], .05, {}); for (let k = 1; k < 9; k++) { const t = k / 9; M.box(x + 1.0 - .55 * t, 3.2 * t, .6, .05, .03, .46, {}); } piece(); piece(); }
    /* the built-in bookcase on the window wall: COURSES. Its third shelf holds his course spines */
    { const z0 = CASE.z0, z1 = CASE.z1 - .02, zc = (z0 + z1) / 2, x = WI - .22; setPlain(M, OAK, L.WOOD); M.box(x, 0, zc, .44, 3.6, z1 - z0, { id: M.nid() });
      for (let k = 0; k < 7; k++) { const y = .1 + k * .5; setPlain(M, OAK2, L.WOOD); M.box(x - .22, y, zc, .05, .04, z1 - z0, { id: M.nid() }); if (k < 6 && k !== 2) plate(M, x - .23, y + .26, zc, z1 - z0 - .12, .44, -Math.PI / 2, k % 2 ? 'spines2' : 'spines', 0, { em: 12, seed: 0 }); }
      plate(M, x - .235, 1.36, zc, z1 - z0 - .12, .42, -Math.PI / 2, 'shelf', 0, { kind: K.PAPER, em: 40, id: 244, seed: 0 });
      setPlain(M, OAK, L.WOOD); M.box(x - .2, 3.5, zc, .52, .14, z1 - z0 + .1, { id: M.nid() }); for (const z of [z0 + .04, z1 - .04]) M.box(x - .2, 0, z, .06, 3.6, .08, { id: M.nid() }); piece(); piece(); }
    /* the door: oak planks in a stone arch, iron straps and a ring */
    { const [a, b] = DOOR, xm = (a + b) / 2; setPlain(M, 0x9a917f, L.BRICK); M.box(a - .08, 0, -D + .05, .16, DH + .1, .12, {}); M.box(b + .08, 0, -D + .05, .16, DH + .1, .12, {}); M.box(xm, DH, -D + .05, b - a + .32, .22, .12, {});
      for (let k = 0; k < 5; k++) { setPlain(M, [OAK, OAK2][k % 2], L.WOOD); M.box(a + .11 + k * .22, 0, -D + .03, .21, DH, .05, { id: M.nid() }); }
      setPlain(M, IRON); for (const y of [.5, 1.9]) M.box(xm, y, -D + .065, b - a, .06, .02, {}); M.at(b - .2, 1.15, -D + .1, 0, () => M.tube([[0, 0, 0], [.06, -.06, 0], [0, -.12, 0], [-.06, -.06, 0]], .009, 10, 4, { closed: true })); piece(); }

    /* DESK: a long oak writing desk before the big window, a green leather top, drawers on his side */
    { const x = 2.6, z = 0, dw = .95, dl = 2.1, top = .76;
      setPlain(M, OAK, L.WOOD); for (const [dx, dz] of [[-dw / 2 + .06, -dl / 2 + .06], [dw / 2 - .06, -dl / 2 + .06], [-dw / 2 + .06, dl / 2 - .06], [dw / 2 - .06, dl / 2 - .06]]) M.box(x + dx, 0, z + dz, .1, top - .06, .1, { id: M.nid() });
      M.box(x, top - .2, z, dw - .06, .14, dl - .06, { id: M.nid() }); setPlain(M, OAK2, L.WOOD); M.box(x, top - .06, z, dw + .06, .06, dl + .06, { id: M.nid() });
      setPlain(M, 0x1f4a34, L.LEATHER); M.box(x, top, z, dw - .14, .006, dl - .3, { id: M.nid() });
      for (const dz of [-.6, 0, .6]) { setPlain(M, OAK2, L.WOOD); M.box(x - dw / 2 + .002, top - .18, z + dz, .02, .1, .5, { id: M.nid() }); brass(M); M.cyl(x - dw / 2 - .01, top - .13, z + dz, .012, .012, .02, 8, {}); }
      /* the folder of what's due, open on the leather, turned to him */
      setPlain(M, 0x2f6a4a); M.rbox(x - .12, top + .008, z - .42, .34, .006, .46, .12, {});
      M.at(x - .12, top + .016, z - .42, -Math.PI / 2 + .12, () => M.plate(0, 0, 0, .3, .4, 0, C.due, { kind: K.PAPER, em: 40, id: 245, seed: 0 }), -Math.PI / 2);
      /* the banker's lamp: brass column, green glass shade */
      brass(M); M.cyl(x + .3, top, z - .8, .09, .07, .02, 14, {}); M.cyl(x + .3, top + .02, z - .8, .012, .012, .34, 8, {}); M.beam([x + .3, top + .36, z - .8], [x + .18, top + .4, z - .8], .012, {});
      setPlain(M, 0x1e6a3e, 0, 60); M.at(x + .14, top + .4, z - .8, 0, () => M.lathe(0, 0, 0, [[.12, 0], [.11, .03], [.05, .1], [0, .105]], 14, { c: 0x1e6a3e }), 0, Math.PI / 2 * .0); setPlain(M, 0xfff0c0, 0, 255); M.cyl(x + .14, top + .385, z - .8, .04, .04, .02, 8, {}); G(x + .14, top + .33, z - .8, [1, .85, .5], .7);
      /* the laptop, open on the course site */
      setPlain(M, 0x2a2a30); M.rbox(x - .05, top + .006, z + .05, .3, .015, .4, 0, {}); M.at(x + .1, top + .02, z + .05, -Math.PI / 2, () => { setPlain(M, 0x2a2a30); M.box(0, 0, -.006, .4, .27, .012, {}); M.plate(0, .135, .002, .37, .23, 0, C.screen, { kind: K.SIGN, em: 160, id: 246, seed: 0 }); }, -.28); G(x + .02, top + .15, z + .05, [.7, .9, 1], .35);
      piece(); piece(); piece(); }
    /* HOURGLASS: brass, on the desk, the sand running while the study clock does */
    { const x = 2.62, z = .62, y = .762, hh = .34; brass(M); M.cyl(x, y, z, .085, .085, .025, 16, {}); M.cyl(x, y + hh - .025, z, .085, .085, .025, 16, {});
      for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + .5; M.cyl(x + Math.cos(a) * .07, y + .025, z + Math.sin(a) * .07, .007, .007, hh - .05, 6, {}); }
      M.at(x, y + hh / 2, z, -Math.PI / 2 + .08, () => M.plate(0, 0, 0, .11, hh - .055, 0, C.sand, { kind: K.PAPER, em: 90, id: 247, seed: 0 })); G(x, y + hh / 2, z, [1, .8, .45], .25); piece(); }
    /* the chair at the desk, its back to him */
    { const x = 1.75, z = 0; setPlain(M, OAK, L.WOOD); for (const [dx, dz] of [[-.2, -.22], [.2, -.22], [-.2, .22], [.2, .22]]) M.box(x + dx, 0, z + dz, .05, .45, .05, {}); M.box(x, .45, z, .5, .05, .52, { id: M.nid() }); setPlain(M, 0x7a2a22, L.LEATHER); M.box(x, .5, z, .46, .05, .48, { id: M.nid() }); setPlain(M, OAK, L.WOOD); for (const dz of [-.22, .22]) M.box(x - .23, .45, z + dz, .05, .55, .05, {}); M.box(x - .23, .86, z, .05, .16, .5, { id: M.nid() }); piece(); }
    /* NOTICEBOARD: cork in an oak frame on an easel by the lancet, turned to him */
    { const x = 3.1, z = -1.95, ry = -Math.PI / 2 + .3;
      M.at(x, 0, z, ry, () => { setPlain(M, OAK2, L.WOOD); for (const s of [-.42, .42]) M.beam([s, 0, .2], [s * .8, 1.95, 0], .045, {}); M.beam([0, 0, -.45], [0, 1.6, -.02], .04, {}); M.box(0, .98, .06, 1.0, .04, .08, {});
        setPlain(M, OAK, L.WOOD); M.box(0, 1.0, .02, 1.04, .8, .05, { id: M.nid() }); M.plate(0, 1.4, .05, .96, .72, 0, C.board, { kind: K.PAPER, em: 30, id: 248, seed: 0 }); }, -.12);
      piece(); piece(); }
    /* the iron chandelier: a ring of candle lamps on chains from the middle beam */
    { const x = .2, y = 3.1; setPlain(M, IRON); for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; M.beam([x, H - .32, 0], [x + Math.cos(a) * .55, y, Math.sin(a) * .55], .01, {}); }
      M.at(x, y, 0, 0, () => M.tube(Array.from({ length: 12 }, (_, i) => [Math.cos(i / 12 * TAU) * .6, 0, Math.sin(i / 12 * TAU) * .6]), .02, 24, 4, { closed: true }));
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, cx2 = x + Math.cos(a) * .6, cz2 = Math.sin(a) * .6; setPlain(M, 0xe8e0c8); M.cyl(cx2, y + .02, cz2, .022, .022, .12, 8, {}); setPlain(M, 0xffd890, 0, 255); M.cyl(cx2, y + .14, cz2, .008, .004, .03, 6, {}); G(cx2, y + .17, cz2, [1, .78, .4], .3); } piece(); }
    /* sconces either side of the big window */
    for (const z of [-1.62, 1.45]) { setPlain(M, IRON); M.box(WI - .03, 1.9, z, .06, .3, .1, {}); M.beam([WI - .03, 2.0, z], [WI - .27, 2.1, z], .02, {}); setPlain(M, 0xe8e0c8); M.cyl(WI - .27, 2.1, z, .025, .025, .12, 8, {}); setPlain(M, 0xffd890, 0, 255); M.cyl(WI - .27, 2.23, z, .008, .004, .03, 6, {}); G(WI - .27, 2.27, z, [1, .78, .4], .4); }
    /* a rug under the desk, deep red with a gold border */
    { setPlain(M, 0x6a1a22, L.WEAVE); M.extrude(roundPoly(2.2, 0, 3.0, 3.2, .05, 2), .022, .03, { grad: .9 }); setPlain(M, 0xc9a23a, L.WEAVE); M.extrude(roundPoly(2.2, 0, 2.7, 2.9, .04, 2), .03, .033, { grad: .9 }); setPlain(M, 0x5a1620, L.WEAVE); M.extrude(roundPoly(2.2, 0, 2.6, 2.8, .04, 2), .033, .036, { grad: .9 }); piece(); }
  });

  /* the glass: what it shows is the skyline across the water, through the hole. The pointed heads in thin slices */
  { const x = A.x + W - .03, q = (o, z0, z1, y0, y1) => { const zs = (o.z1 - o.z0) / 2, zc = (o.z0 + o.z1) / 2, yh = o.y2; GL.set({ kind: K.GLASS, c: [1, 1, 1], id: 0 }); const u0 = (z0 - zc + zs) / (2 * zs), u1 = (z1 - zc + zs) / (2 * zs), v0 = y0 / yh, v1 = y1 / yh; GL.quad([x, A.y + y0, A.z + z1], [x, A.y + y0, A.z + z0], [x, A.y + y1, A.z + z0], [x, A.y + y1, A.z + z1], [u1, v0, u0, v1]); };
    for (const o of [BW]) { const zc = (o.z0 + o.z1) / 2; q(o, o.z0, o.z1, o.y0, o.y1); const N = 8; for (let i = 0; i < N; i++) { const ya = o.y1 + (o.y2 - o.y1) * i / N, yb = o.y1 + (o.y2 - o.y1) * (i + 1) / N, hw = archHalf(o, (ya + yb) / 2); if (hw > .01) q(o, zc - hw, zc + hw, ya, yb); } } }

  /* light on the floor: the windows, the desk lamp, the chandelier */
  { const X2 = v => A.x + v, Z2 = v => A.z + v, Y = A.y;
    const blob = (x, y, z, sx, sz, c, a) => { FXM.set({ kind: 7, a, c }); FXM.quad([X2(x - sx / 2), Y + y, Z2(z + sz / 2)], [X2(x + sx / 2), Y + y, Z2(z + sz / 2)], [X2(x + sx / 2), Y + y, Z2(z - sz / 2)], [X2(x - sx / 2), Y + y, Z2(z - sz / 2)], [0, 0, 1, 1]); };
    blob(WI - 1.3, .04, 0, 2.6, 3.0, [.55, .7, 1], 30); blob(WI - .7, .04, -2.55, 1.4, 1.2, [.55, .7, 1], 22); blob(2.45, .775, -.6, 1.0, 1.0, [1, .85, .5], 34); blob(.2, .04, 0, 3.2, 3.2, [1, .75, .4], 22); }
  const fxBase = FXM.n;

  /* ---------- clutter: a scholar's hall, kept clear of the four that matter ---------- */
  Z.at(A.x, A.y, A.z, 0, () => {
    const pl = (c, l = 0) => setPlain(Z, c, l);
    const book = (x, y, z, ry, bw, bh, bd, c) => { pl(c); Z.rbox(x, y, z, bw, bh, bd, ry, {}); pl(0xf2ead6); Z.rbox(x + .006, y + .004, z, bw - .01, bh - .008, bd - .02, ry, {}); };
    /* on the window seat: library books with sticky tabs, highlighters */
    { const zc = (LW.z0 + LW.z1) / 2; for (let k = 0; k < 4; k++) book(WI + .12 + (k % 2) * .08, LW.y0 + .1 + k * .045, zc - .12 + (k % 3) * .04, .3 * k - .4, .2, .04, .28, [0x24405a, 0x7a2a22, 0x2f4a3c, 0xc9a23a][k]);
      for (let k = 0; k < 6; k++) { pl([0xf6ee1c, 0xff2e88, 0x16e4f4][k % 3]); Z.rbox(WI + .2, LW.y0 + .13 + (k % 4) * .045, zc + .02 + (k % 3) * .05, .012, .02, .03, .2, {}); }
      for (const [dz, c] of [[.22, 0xf6ee1c], [.27, 0xff2e88]]) { pl(c); Z.at(WI + .35, LW.y0 + .12, zc + dz, .3, () => Z.cyl(0, 0, 0, .01, .01, .12, 6, {}), Math.PI / 2); } piece(); piece(); }
    /* by the door: a travel duffel, a globe on its stand, a map tube, postcards pinned to the stone */
    { pl(0x3a4a2a, L.WEAVE); Z.blob(-2.7, .2, -D + .45, .32, { c: 0x3a4a2a, sy: .55, j: .1 }); pl(0x5a3a1a, L.LEATHER); Z.tube([[-2.95, .32, -D + .45], [-2.7, .52, -D + .45], [-2.45, .32, -D + .45]], .018, 10, 4, {});
      pl(OAK2, L.WOOD); Z.cyl(-1.8, 0, -D + .5, .16, .12, .04, 12, {}); Z.cyl(-1.8, .04, -D + .5, .02, .02, .7, 8, {}); brass(Z); Z.at(-1.8, .98, -D + .5, 0, () => Z.tube(Array.from({ length: 10 }, (_, i) => [0, Math.sin(i / 10 * TAU) * .26, Math.cos(i / 10 * TAU) * .26]), .01, 20, 4, { closed: true }), 0, .41);
      pl(0x3a7a9a); Z.blob(-1.8, .98, -D + .5, .23, { c: 0x3a7a9a, sy: 1, j: .02 }); pl(0xd8c890); for (let k = 0; k < 5; k++) Z.blob(-1.8 + Math.cos(k * 1.3) * .14, .98 + Math.sin(k * 2.1) * .12, -D + .5 + Math.sin(k * 1.3) * .14, .08, { c: 0xd8c890, sy: .6, j: .2 });
      pl(0x2a2a30); Z.at(-2.3, .02, -D + .3, 0, () => Z.cyl(0, 0, 0, .05, .05, .85, 10, {}), .18); pl(0xc9a23a); Z.at(-2.3, .02, -D + .3, 0, () => Z.cyl(0, .8, 0, .052, .052, .06, 10, {}), .18);
      plate(Z, -1.0, 1.55, -D + .02, .5, .19, 0, 'post', 0, { em: 20, seed: 0 }); plate(Z, -2.1, 1.65, -D + .02, .6, .4, 0, 'map', 0, { em: 20, seed: 0 }); piece(); piece(); }
    /* the banner on the left wall */
    { pl(IRON); Z.box(-.6, 3.3, -D + .08, 1.0, .03, .03, {}); plate(Z, -.6, 2.58, -D + .06, .7, 1.45, 0, 'banner', 0, { em: 25, seed: 0 }); piece(); }
    /* an old candelabra on a side table, a neon tube where the candles were */
    { pl(OAK, L.WOOD); Z.box(.9, 0, -D + .4, .7, .7, .45, {}); pl(OAK2, L.WOOD); Z.box(.9, .7, -D + .4, .76, .04, .5, {});
      brass(Z, 0xb8a060); Z.lathe(.9, .74, -D + .4, [[.09, 0], [.06, .03], [.025, .08], [.02, .38], [.03, .4]], 12, {}); Z.beam([.72, 1.14, -D + .4], [1.08, 1.14, -D + .4], .02, {});
      for (const dx of [-.18, 0, .18]) { brass(Z, 0xb8a060); Z.cyl(.9 + dx, 1.14, -D + .4, .025, .02, .04, 8, {}); setPlain(Z, 0xff2e88, 0, 255); Z.set({ kind: K.NEON, seed: 3 }); Z.cyl(.9 + dx, 1.18, -D + .4, .014, .014, .24, 8, { c: 0xff2e88 }); G(.9 + dx, 1.32, -D + .4, [1, .2, .6], .45, 0, zGlows); } setPlain(Z, 0x000000);
      /* the peacock feather in a jar beside it */
      Z.set({ kind: K.PLAIN, c: hex(0xb8d8e0), em: 0, layer: 0 }); Z.lathe(1.15, .74, -D + .32, [[.04, 0], [.045, .12], [.03, .14], [.032, .16]], 10, {}); pl(0x8a7a40); Z.beam([1.15, .78, -D + .32], [1.22, 1.35, -D + .3], .004, {});
      pl(0x1f8a6a); Z.blob(1.22, 1.38, -D + .3, .05, { c: 0x1f8a6a, sy: 1.6, j: .05 }); pl(0x1f5fa0); Z.blob(1.222, 1.39, -D + .275, .025, { c: 0x1f5fa0, sy: 1.3, j: .02 }); piece(); piece(); }
    /* the space heater by the reading chair, its coils glowing */
    { pl(0xd8d4cc); Z.rbox(-1.4, .02, D - .5, .4, .5, .18, .3, {}); setPlain(Z, 0xff6a2a, 0, 220); Z.rbox(-1.4 + Math.sin(.3) * .095, .12, D - .5 + Math.cos(.3) * .095, .32, .3, .01, .3, {}); G(-1.35, .3, D - .38, [1, .4, .1], .5, 0, zGlows); piece(); }
    /* a reading chair in the right corner, a throw, a stack of books on the floor */
    { pl(0x5a2a2a, L.LEATHER); Z.box(-2.6, .05, D - .65, .85, .4, .8, {}); Z.box(-2.6, .45, D - .3, .85, .55, .2, {}); for (const s of [-1, 1]) Z.box(-2.6 + s * .4, .45, D - .65, .14, .25, .8, {}); pl(0x7a3a32, L.LEATHER); Z.box(-2.6, .45, D - .72, .62, .12, .6, {});
      pl(0xc9a23a, L.WEAVE); Z.blob(-2.35, .6, D - .4, .2, { c: 0xc9a23a, sy: .6, j: .2 });
      for (let k = 0; k < 6; k++) book(-1.9 + (k % 2) * .03, .02 + k * .055, D - .9, k * .4, .26, .055, .2, [0x24405a, 0x7a2a22, 0x2f4a3c, 0xe8e0d0, 0x5a3a6a, 0xa8442a][k]); piece(); piece(); }
    /* on the desk: a mug, a pen pot, a stack of readings, a notebook */
    { const top = .766; pl(0xe8e0c8); Z.lathe(2.85, top, .25, [[.04, 0], [.042, .1], [0, .1]], 12, {}); Z.tube([[2.89, top + .03, .25], [2.92, top + .055, .25], [2.89, top + .08, .25]], .008, 6, 4, {});
      pl(0x2a2a30); Z.cyl(2.85, top, -.25, .035, .035, .1, 10, {}); for (let k = 0; k < 3; k++) { pl([0xf6ee1c, 0x16e4f4, 0x1a1a1e][k]); Z.at(2.85 + (k - 1) * .012, top + .02, -.25, 0, () => Z.cyl(0, 0, 0, .005, .005, .15, 6, {}), (k - 1) * .2); }
      for (let k = 0; k < 4; k++) { pl(0xf2ead6); Z.rbox(2.35, top + .004 + k * .006, .95, .22, .005, .3, .1 * k - .1, {}); } pl(0x1a1a20, L.LEATHER); Z.rbox(2.35, top + .03, .95, .15, .015, .21, .2, {}); piece(); piece(); }
    /* a pile of books against the back shelves, a candle on the floor by the lancet */
    { for (let k = 0; k < 5; k++) book(-W + .75, .02 + k * .07, -1.6 + (k % 2) * .03, k * .25, .3, .07, .22, [0x7a2a22, 0x24405a, 0xc9a23a, 0x2f4a3c, 0x16121c][k]); pl(0xe8e0c8); Z.cyl(WI - .35, .02, -1.55, .04, .04, .18, 10, {}); Z.set({ kind: K.PLAIN, c: hex(0xffd080), em: 255, layer: 0 }); Z.cyl(WI - .35, .2, -1.55, .006, .004, .02, 6, {}); G(WI - .35, .24, -1.55, [1, .75, .35], .25, 0, zGlows); piece(); }
  });

  const lights = [
    [...w(2.45, 1.25, -.75), 0xffd090, 4.5, .9],
    [...w(.2, 2.9, 0), 0xffc880, 8, .7],
    [...w(W + 1.6, 2.2, 0), 0x9ab4ff, 9, .5],
    [...w(WI - .3, 2.3, -1.62), 0xffc880, 3.5, .45],
    [...w(WI - .3, 2.3, 1.45), 0xffc880, 3.5, .45],
    [...w(.9, 1.4, -D + .55), 0xff3aa0, 3.5, .6],
    [...w(-1.35, .5, D - .6), 0xff6a2a, 3, .5],
    [...w(-3.6, 2.2, 0), 0xffc890, 6, .3],
  ];
  const hot = [
    { key: 'desk', label: 'DUE', hotkey: 'E', line: 16, sheet: 'cDue', p: w(2.42, .86, -.42) },
    { key: 'glass', label: 'STUDY', hotkey: 'R', line: 22, sheet: 'cStudy', p: w(2.62, 1.12, .62) },
    { key: 'board', label: 'COURSE', hotkey: 'F', line: 12, sheet: 'cBoard', p: w(3.05, 1.6, -1.92) },
    { key: 'shelf', label: 'COURSES', hotkey: 'G', line: 14, sheet: 'cShelf', p: w(WI - .3, 1.4, 2.2) },
  ];
  return {
    geom: M.geom(), clutterGeom: Z.geom(), glassGeom: GL.geom(), fxGeom: FXM.geom(), lights, hot, glows: [...glows, ...zGlows], glowsPlain: glows, clutterLight: 6, fxPlain: fxBase, pieces: PIECES, tris: M.n / 3, clutterTris: Z.n / 3, atlas: tex, day: new Date().toDateString(),
    paint, sand, setDoor() {},
  };
}

/* ---------- renderer, passes and the camera story ---------- */
const canvas = $('#gl');
const RIG = QS.has('cityrig');
let renderer;
/* the first, friendly reason is the one he sees; a later error never overwrites it */
let failMsg = '';
const FAIL = (msg) => { failMsg = failMsg || msg; };
const DPR = Math.min(window.devicePixelRatio || 1, 3);
const isPhone = Math.min(innerWidth, innerHeight) < 600 || /iPhone|Android/.test(navigator.userAgent);

const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const Q = { tier: isPhone ? 1 : 2, scale: 1, base: 1, ink: true, bloom: true, refl: true, shadow: true, grain: .024 };
/* Settings > Performance, his pick on this device: frames a second (moving, idle), the sharpness cap, and whether bloom and
   reflections may run. Auto and Smooth are the city as tuned; Balanced halves the frames and softens; Saver is plain and slow */
const PQ = { auto: { fps: 60, idle: 30, dpr: 3, fx: true }, lite: { fps: 60, idle: 30, dpr: 1, fx: true, weak: true }, smooth: { fps: 60, idle: 30, dpr: 3, fx: true }, balanced: { fps: 30, idle: 20, dpr: 1.5, fx: true }, saver: { fps: 20, idle: 10, dpr: 1, fx: false } };
let PM = PQ.auto;
/* Auto on a plain laptop chip (Intel's UHD or HD graphics, a basic or software driver; never a phone): there the city is
   bound by pixels, measured on his Intel UHD at 1536x864: 119 ms a frame at the usual 1.5x, 68 at 1x, 40 at .75x, 27 at .5x,
   and about 10 of it reflections. So Auto goes light: no 1.5x, a start at .74 of the screen's pixels with reflections off,
   and the city may step down as far as the rooms (bloom and ink cost next to nothing and stay). ?cityweak forces it */
let WEAK = false;
function weakGpu() {
  if (QS.has('cityweak')) return true;
  if (isPhone || RIG) return false;
  try { const g = renderer.getContext(), d = g.getExtension('WEBGL_debug_renderer_info'); const n = String(d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER));
    return /Intel.*\b(UHD|HD) Graphics|Basic Render|llvmpipe/i.test(n) && !/Iris|Arc/i.test(n); } catch (e) { return false; }
}
function perfPick(pick) { PM = pick === 'auto' && WEAK ? PQ.lite : PQ[pick] || PQ.auto; if (!PM.fx) { Q.bloom = false; Q.refl = false; } else { Q.bloom = true; Q.refl = !PM.weak; } Q.scale = PM.weak ? .74 : 1; S.upHold = 0; adaptCool = 3; S.fps = PM.fps; if (typeof renderer !== 'undefined' && renderer) resize(); }
const TIME = { value: 0 };
const moonDir = new THREE.Vector3(.13, .262, -.956).normalize();
const moonSkyDir = new THREE.Vector3(.15, .31, -.94).normalize();
const shU = { uTime: TIME };

/* ---------- sky: the sun where he lives, and the weather there ----------
   /api/sky gives the place and its weather now; the sun is worked out here from the place and the clock. Daylight 0 is
   the night exactly as painted (rain and the moon). That is also what shows before the first answer, offline with
   nothing kept, and in the test rig until a test sets the sky. The scene's -z is south, so the sun crosses the
   opening view from left to right, as the moon hangs there. */
const SKY_U = { sky: { value: new THREE.Vector4(0, 0, 1, 0) }, skyH: { value: new THREE.Color() }, skyZ: { value: new THREE.Color() }, lamp: { value: new THREE.Vector2(1, 1) }, dayFx: { value: 0 }, rainK: { value: new THREE.Vector4(1, 0, 0, 0) }, drops: { value: 1 },
  look: { value: new THREE.Vector4(0, 0, 1, 0) }, sun: { value: new THREE.Vector3(0, -1, 0) }, sunC: { value: new THREE.Color() }, haze: { value: new THREE.Color() }, cloudB: { value: new THREE.Color() }, cloudR: { value: new THREE.Color() } };
const SKY_RAIN = { cloud: 1, rain: 1, snow: 0, wet: 1, cover: 0, fog: 0 };
const SKY = { at: null, wx: null, wind: null, over: null, el: -90, az: 0, L: -1, w: { ...SKY_RAIN }, key: moonDir.clone(), baked: moonDir.clone(), next: 0, ask: 0 };
const mixN = (a, b, t) => a * (1 - t) + b * t;   /* exact at both ends, so daylight 0 leaves the night as it was */
const mixO = (a, b, t) => { const o = {}; for (const k in a) o[k] = Array.isArray(a[k]) ? a[k].map((v, i) => mixN(v, b[k][i], t)) : mixN(a[k], b[k], t); return o; };
const SKY_N = { key: [.22, .28, .42], hi: [.14, .18, .28], lo: [.085, .06, .07], side: [.44, .35, .34], fogHi: [.05, .068, .09], fogLo: [.27, .15, .105], rim: [.16, .38, .55], fogD: .002, pool: .62 };
/* clear and overcast, at full day and in the warm hours either side of it */
const SKY_D = [
  { key: [1.25, 1.16, 1.02], hi: [.64, .68, .76], lo: [.42, .39, .36], side: [.24, .24, .26], fogHi: [.62, .7, .8], fogLo: [.72, .74, .76], rim: [.32, .34, .36], fogD: .0011, pool: .05, h: [.68, .76, .86], z: [.24, .45, .74], sunC: [1, .95, .85], cb: [.92, .93, .95], cr: [1, 1, 1] },
  { key: [.3, .31, .33], hi: [.78, .8, .84], lo: [.46, .45, .45], side: [.2, .2, .21], fogHi: [.62, .64, .68], fogLo: [.64, .65, .67], rim: [.22, .23, .25], fogD: .0017, pool: .08, h: [.66, .68, .71], z: [.5, .53, .58], sunC: [.6, .6, .6], cb: [.6, .62, .66], cr: [.74, .75, .78] }];
const SKY_W = [
  { key: [1, .55, .3], hi: [.3, .28, .42], lo: [.22, .13, .12], side: [.32, .2, .18], fogHi: [.42, .34, .45], fogLo: [.86, .52, .36], rim: [.55, .32, .3], fogD: .0014, pool: .3, h: [1, .56, .32], z: [.2, .24, .46], sunC: [1, .6, .3], cb: [.42, .3, .42], cr: [1, .66, .42] },
  { key: [.3, .22, .2], hi: [.4, .36, .42], lo: [.24, .2, .2], side: [.15, .12, .12], fogHi: [.42, .38, .42], fogLo: [.55, .45, .44], rim: [.3, .26, .27], fogD: .0018, pool: .35, h: [.55, .44, .44], z: [.3, .3, .36], sunC: [.6, .45, .35], cb: [.38, .34, .38], cr: [.62, .5, .48] }];
/* named skies for the rig and ?sky=: a time [elevation, azimuth from south, west positive] and a weather */
const SKY_TIMES = { night: [-30, 0], dawn: [-2, -72], morning: [14, -45], day: [24, -5], noon: [24, -5], afternoon: [16, 40], dusk: [1, 64] };
const SKY_WX = { rain: SKY_RAIN, clear: { cloud: .12, rain: 0, snow: 0, wet: 0, cover: 0, fog: 0 }, cloud: { cloud: .92, rain: 0, snow: 0, wet: 0, cover: 0, fog: 0 }, snow: { cloud: 1, rain: 0, snow: .85, wet: 0, cover: 1, fog: 0 }, fog: { cloud: 1, rain: 0, snow: 0, wet: .4, cover: 0, fog: 1 }, wet: { cloud: .6, rain: 0, snow: 0, wet: .7, cover: 0, fog: 0 } };
function sunAt(ms, lat, lon) {
  const R = Math.PI / 180, d = ms / 864e5 - 10957.5;
  const g = (357.529 + .98560028 * d) * R, q = 280.459 + .98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + .02 * Math.sin(2 * g)) * R, e = (23.439 - .00000036 * d) * R;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)), dec = Math.asin(Math.sin(e) * Math.sin(L));
  const H = ((18.697374558 + 24.06570982441908 * d) * 15 + lon) * R - ra, la = lat * R;
  return { el: Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(H)) / R, az: Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(la) - Math.tan(dec) * Math.cos(la)) / R };
}
/* the weather codes (WMO) and amounts the Worker passes on, as what the city shows */
function skyWeather(x) {
  const c = x.code | 0, snowing = (c >= 71 && c <= 77) || c === 85 || c === 86, raining = !snowing && ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95), fog = c === 45 || c === 48;
  const rain = raining ? clamp(.45 + (x.precip || 0) * .3, .45, 1) : 0, snow = snowing ? clamp(.45 + (x.snowfall || 0) * .6, .45, 1) : 0;
  const cover = clamp((x.depth || 0) / .05);
  return { cloud: clamp(Math.max((x.cloud == null ? 100 : x.cloud) / 100, rain || snow || fog ? .92 : 0)), rain, snow, cover, fog: fog ? 1 : 0,
    wet: rain ? 1 : (x.recent || 0) > .2 ? .7 : cover > 0 && (x.temp || 0) > 1 ? .5 : 0 };
}
/* a room by day: its ambient lifted toward daylight, the window throwing daylight, her in it. At night the room is as painted */
const ROOM_DAY = [[.6, .6, .64], [.38, .36, .36], [.1, .1, .11], [.62, .64, .68]];
function skyRoom() {
  if (!room.def || !room.u || !SKY.T) return;
  const L = Math.max(SKY.L, 0), w = skyW(), a = room.def.amb, d = room.def.ambDay || ROOM_DAY, dim = mixN(1, .78, w.cloud), warm = [1, mixN(1, .88, SKY.W), mixN(1, .76, SKY.W)];
  const m = i => [0, 1, 2].map(j => mixN(a[i][j], d[i][j] * dim * warm[j], L));
  room.u.uAmbHi.value.setRGB(...m(0)); room.u.uAmbLo.value.setRGB(...m(1)); room.u.uAmbSide.value.setRGB(...m(2)); room.u.uRim.value.setRGB(...m(3));
  room.u.uSky.value.set(L, SKY.W, clamp(w.rain * 2), 0); room.u.uSkyH.value.setRGB(...SKY.T.sunC.map(v => v * 1.1));
  /* the room's own lamps: full at night and on a dark wet day, turned down when a clear day lights the room */
  const lk = 1 - L * mixN(.55, .2, w.cloud); if (room.lights && Math.abs(lk - (room.lampK ?? 1)) > .004) { room.lampK = lk; roomLights(); }
  FIG_DAY.value = L;
}
function skyAsk() {
  /* every 15 minutes while the city is on; what came back last is kept for the next start */
  SKY.ask = performance.now() + 9e5;
  fetch('./api/sky', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(x => { if (!x || !x.at) return; if (!SKY.wx) SKY.snap = true; SKY.at = x.at; SKY.wx = skyWeather(x); SKY.wind = x.wind == null ? null : clamp(x.wind / 45); try { localStorage.setItem('city.sky', JSON.stringify({ at: x.at, wx: SKY.wx, wind: SKY.wind, t: Date.now() })); } catch (e) { } SKY.next = 0; }).catch(() => { });
}
function skyKept() {
  try { const k = JSON.parse(localStorage.getItem('city.sky') || 'null'); if (k && k.at) { SKY.at = k.at; if (Date.now() - k.t < 3 * 36e5) { SKY.wx = k.wx; SKY.wind = k.wind ?? null; } } } catch (e) { }
}
/* a sky by name ('day,snow'), or { el, az, cloud, rain, snow, wet, cover, fog }; null goes back to the real one */
function skyParse(s) {
  if (!s) return null; if (typeof s === 'object') return s;
  const o = {}; for (const w of String(s).split(/[ ,]+/)) { if (SKY_TIMES[w]) { o.el = SKY_TIMES[w][0]; o.az = SKY_TIMES[w][1]; } if (SKY_WX[w]) Object.assign(o, SKY_WX[w]); }
  return o;
}
/* the weather as shown: up at the chalet, what falls downtown as rain falls as snow, and nothing is wet */
const skyW = () => { const w = SKY.w; if (room.id !== 'chalet' || S.mode === 'city') return w; return { ...w, snow: Math.max(w.snow, w.rain), rain: 0, wet: Math.min(w.wet, .2) }; };
function skyTick(t, now = Date.now()) {
  if (!RIG && SKY.ask && performance.now() > SKY.ask) skyAsk();
  if (!RIG && t < SKY.next) return;
  SKY.next = t + .25;
  const o = SKY.over;
  if (o && o.el != null) { SKY.el = o.el; SKY.az = o.az || 0; }
  else if (SKY.at) { const s = sunAt(now, SKY.at[0], SKY.at[1]); SKY.el = s.el; SKY.az = s.az; }
  else { SKY.el = -90; SKY.az = 0; }
  /* weather eases over a minute or so; the rig takes it at once */
  const want = { ...SKY_RAIN, ...(SKY.at && SKY.wx ? SKY.wx : {}), ...(o || {}) };
  const k = RIG || SKY.snap || SKY.L < 0 ? 1 : .006; SKY.snap = false; for (const n in SKY.w) SKY.w[n] = n in want ? mixN(SKY.w[n], want[n], k) : SKY.w[n];
  const el = SKY.el, w = skyW(), L = sstep(-10, 7, el), W = (1 - sstep(4, 16, el)) * sstep(-14, -4, el), R = Math.PI / 180;
  const T = mixO(mixO(SKY_D[0], SKY_D[1], w.cloud), mixO(SKY_W[0], SKY_W[1], w.cloud), W), U = mixO(SKY_N, T, L);
  /* light: the sun while it is up or nearly, kept a little above the roofs so streets aren't all in shade; the moon after */
  const up = el > -3, le = Math.max(el, 7) * R, az = SKY.az * R;
  if (up) SKY.key.set(Math.cos(le) * Math.sin(az), Math.sin(le), -Math.cos(le) * Math.cos(az)).normalize(); else SKY.key.copy(moonDir);
  /* the night's air was painted for rain: drier air is clearer, fog is thick */
  const keyK = up ? sstep(-3, 4, el) : 1 - sstep(-10, -3, el), fogK = 1 - .7 * (1 - Math.max(w.rain, w.snow)) + 2.5 * w.fog;
  const u = city.u;
  if (u) {
    u.uMoon.value = SKY.key; u.uMoonC.value.setRGB(...U.key.map(v => v * keyK));
    u.uAmbHi.value.setRGB(...U.hi); u.uAmbLo.value.setRGB(...U.lo.map(v => v + w.cover * .22 * L)); u.uAmbSide.value.setRGB(...U.side);
    u.uFogHi.value.setRGB(...U.fogHi); u.uFogLo.value.setRGB(...U.fogLo.map(v => mixN(v, .7 * L + .12, w.fog * .6))); u.uRim.value.setRGB(...U.rim);
    u.uFogD.value = U.fogD * fogK; u.uPoolK.value = U.pool;
    if (Math.abs(L - SKY.L) > .004) { setLights(u, city.lightList.map(l => [l[0], l[1], l[2], l[3], l[4], l[5] * (1 - L * .85)])); city.glow.material.uniforms.uGlowK.value = city.glowMir.material.uniforms.uGlowK.value = 1 - L * .7; }
  }
  SKY_U.sky.value.set(L, W, w.wet, w.cover);
  SKY_U.skyH.value.setRGB(...T.h); SKY_U.skyZ.value.setRGB(...T.z);
  SKY_U.look.value.set(L, W, w.cloud, 0); SKY_U.sunC.value.setRGB(...T.sunC); SKY_U.cloudB.value.setRGB(...T.cb); SKY_U.cloudR.value.setRGB(...T.cr); SKY_U.haze.value.setRGB(...U.fogLo);
  SKY_U.sun.value.set(Math.cos(el * R) * Math.sin(az), Math.sin(el * R), -Math.cos(el * R) * Math.cos(az));
  SKY_U.lamp.value.set(1 - L * .65, (1 - L * .7) * mixN(.15, 1, w.wet)); SKY_U.dayFx.value = L;
  const fall = Math.max(w.rain, w.snow), sn = w.snow > w.rain ? 1 : 0;
  SKY_U.rainK.value.set(fall, sn, 0, 0);
  if (city.umb) { const up = w.rain > .05; for (const p of city.umb) { p.wet.visible = up; p.dry.visible = !up; } }
  if (city.rain) { city.rain.geometry.instanceCount = fall > .02 ? Math.ceil(city.rain.userData.n * Math.min(1, fall * 1.15)) : 0; city.rain.material.uniforms.uRainC.value.setRGB(...(sn ? [.82, .85, .92] : [mixN(.55, .2, L), mixN(.55, .21, L), mixN(.75, .24, L)])); }
  SKY.L = L; SKY.W = W; SKY.T = T;
  SKY_U.drops.value = clamp(w.rain * 1.6);
  skyRoom();
  /* the shadows follow the light once it has moved a degree or so; never mid-flight */
  if (city.world && SKY.key.angleTo(SKY.baked) > .022 && (RIG || S.mode !== 'fly')) { SKY.baked.copy(SKY.key); bakeCity(); }
}

function makeRT(w, h, o = {}) { const rt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: !!o.depth, stencilBuffer: false, samples: o.samples || 0, generateMipmaps: false }); rt.texture.colorSpace = THREE.NoColorSpace; if (o.depthTex) { rt.depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedIntType); rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter; } return rt; }

let RT = {}; let TEX = {}; let MAT = {}; let SC = {}; let CAM; let city = {}, room = {};
const fsGeom = new THREE.BufferGeometry(); fsGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
const fsCam = new THREE.Camera();
function fsPass(fs, uniforms) { const m = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: FS_VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, blending: THREE.NoBlending }); const q = new THREE.Mesh(fsGeom, m); q.frustumCulled = false; const s = new THREE.Scene(); s.add(q); return { s, m }; }

function worldUniforms(isRoom) {
  const LP = []; const LC = []; for (let i = 0; i < NL; i++) { LP.push(new THREE.Vector3()); LC.push(new THREE.Vector4(0, 0, 0, 0)); }
  return {
    uTime: TIME, uMY: { value: .2 }, uRoomMode: { value: isRoom ? 1 : 0 }, uShadowOn: { value: 0 }, uShadowBias: { value: isRoom ? .02 : .9 }, uReflOn: { value: 0 }, uRainWin: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) }, uSigns: { value: TEX.signs }, uAds: { value: TEX.ads }, uPool: { value: TEX.pool }, uShadow: { value: null }, uRefl: { value: null }, uMirror: { value: null }, uClipZ: { value: 0 }, uTiles: { value: TEX.tiles }, uShadowM: { value: new THREE.Matrix4() },
    uLP: { value: LP }, uLC: { value: LC },
    uTill: { value: new THREE.Vector4(0, 0, 1, 1) }, uMoon: { value: moonDir }, uMoonC: { value: isRoom ? new THREE.Color(0, 0, 0) : new THREE.Color(.22, .28, .42) },
    uAmbHi: { value: isRoom ? new THREE.Color(.3, .25, .34) : new THREE.Color(.14, .18, .28) }, uAmbLo: { value: isRoom ? new THREE.Color(.2, .11, .2) : new THREE.Color(.085, .06, .07) }, uAmbSide: { value: isRoom ? new THREE.Color(.05, .05, .09) : new THREE.Color(.44, .35, .34) },
    uFogHi: { value: new THREE.Color(.05, .068, .09) }, uFogLo: { value: new THREE.Color(.27, .15, .105) }, uRim: { value: isRoom ? new THREE.Color(.3, .72, .85) : new THREE.Color(.16, .38, .55) },
    uFogD: { value: isRoom ? 0 : .002 }, uFogH: { value: isRoom ? .01 : .0027 }, uPoolR: { value: POOL_R }, uPoolK: { value: isRoom ? 0 : .62 },
    uGobo: { value: new THREE.Vector4(0, 1, 0, 1) }, uGoboD: { value: new THREE.Vector3(1, 1, 0).normalize() }, uGoboC: { value: new THREE.Color(0, 0, 0) }, uGoboX: { value: 0 },
    /* the city shares the one sky; a room keeps its own, night until it is lit for the day */
    uSky: isRoom ? { value: new THREE.Vector4(0, 0, 1, 0) } : SKY_U.sky, uSkyH: isRoom ? { value: new THREE.Color() } : SKY_U.skyH, uSkyZ: isRoom ? { value: new THREE.Color() } : SKY_U.skyZ,
  };
}
/* the room's lights as listed, the lamps scaled by the daylight (skyRoom), the clutter's light off with the clutter */
function roomLights() { const k = room.lampK ?? 1, off = room.clutter && !room.clutter.visible; setLights(room.u, room.lights.map((l, i) => off && i === room.clutterLight ? [0, 0, 0, 0, -1, 0] : [l[0], l[1], l[2], l[3], l[4], l[5] * k])); }
function setLights(u, list) { for (let i = 0; i < NL; i++) { const l = list[i]; if (l) { u.uLP.value[i].set(l[0], l[1], l[2]); const c = hex(l[3]); u.uLC.value[i].set(c[0] * l[5], c[1] * l[5], c[2] * l[5], l[4]); } else u.uLC.value[i].w = 0; } }
const worldMat = (uni, defs = {}, side = THREE.FrontSide) => new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: WORLD_VS, fragmentShader: WORLD_FS, uniforms: uni, defines: defs, side, blending: THREE.NoBlending });
const addBlend = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, transparent: true, depthWrite: false };

function buildGlowMesh(list, defs = {}) {
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, -.5, 0, .5, .5, 0, -.5, .5, 0]), 3));
  const P = new Float32Array(list.length * 3), C = new Float32Array(list.length * 4);
  list.forEach((l, i) => { P[i * 3] = l.x; P[i * 3 + 1] = l.y; P[i * 3 + 2] = l.z; C[i * 4] = l.r; C[i * 4 + 1] = l.g; C[i * 4 + 2] = l.b; C[i * 4 + 3] = l.a ? -l.s : l.s; });
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute('iCol', new THREE.InstancedBufferAttribute(C, 4)); g.instanceCount = list.length;
  const m = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: GLOW_VS, fragmentShader: GLOW_FS, defines: defs, uniforms: { uTime: TIME, uMY: { value: .2 }, uSizeK: { value: 1 }, uGlowK: { value: 1 } }, ...addBlend });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; return mesh;
}

/* the same vertices, drawn cell by cell so the frustum can skip what is behind the camera */
function splitCells(g, size) {
  const P = g.getAttribute('position').array, n = P.length / 9, cells = new Map();
  for (let i = 0; i < n; i++) { const o = i * 9; const x = (P[o] + P[o + 3] + P[o + 6]) / 3, z = (P[o + 2] + P[o + 5] + P[o + 8]) / 3; const k = Math.floor(x / size) + ',' + Math.floor(z / size); let c = cells.get(k); if (!c) { c = []; cells.set(k, c); } c.push(i); }
  const out = []; const v = new THREE.Vector3();
  for (const list of cells.values()) {
    const idx = new Uint32Array(list.length * 3), box = new THREE.Box3(); list.forEach((t, j) => { idx[j * 3] = t * 3; idx[j * 3 + 1] = t * 3 + 1; idx[j * 3 + 2] = t * 3 + 2; for (let k = 0; k < 3; k++) { v.fromArray(P, t * 9 + k * 3); box.expandByPoint(v); } });
    const m = new THREE.BufferGeometry(); for (const nm of ['position', 'normal', 'aCol', 'aUv', 'aMat']) m.setAttribute(nm, g.getAttribute(nm)); m.setIndex(new THREE.BufferAttribute(idx, 1)); m.boundingSphere = box.getBoundingSphere(new THREE.Sphere()); out.push(m);
  }
  return out;
}
/* reflections do not need balconies, air units or litter: keep big faces and anything that glows */
function mirrorSubset(g) {
  const P = g.getAttribute('position').array, M = g.getAttribute('aMat').array, n = P.length / 9, keep = [];
  const big = 3.6 * 3.6;
  for (let i = 0; i < n; i++) { const o = i * 9, kind = M[i * 12] & 15; let k = kind === K.NEON || kind === K.SIGN || kind === K.AD || kind === 1; if (!k) { const dx = P[o] - P[o + 3], dy = P[o + 1] - P[o + 4], dz = P[o + 2] - P[o + 5], ex = P[o] - P[o + 6], ey = P[o + 1] - P[o + 7], ez = P[o + 2] - P[o + 8]; k = dx * dx + dy * dy + dz * dz > big || ex * ex + ey * ey + ez * ez > big; } if (k) keep.push(i * 3, i * 3 + 1, i * 3 + 2); }
  const m = new THREE.BufferGeometry(); for (const nm of ['position', 'normal', 'aCol', 'aUv', 'aMat']) m.setAttribute(nm, g.getAttribute(nm)); m.setIndex(new THREE.BufferAttribute(new Uint32Array(keep), 1)); return m;
}
function trafficSetup() {
  const R = rng(66);
  const rows = { hwyE: lane(offsetPts(HIGHWAY, 4)), hwyW: lane(offsetPts(HIGHWAY, 4), true) };
  const aveN = lane([[-5, .1, 300], [-5, .1, -160]]), aveS = lane([[5, .1, -160], [5, .1, 300]]);
  const ew = [lane([[-430, .1, 147], [430, .1, 147]]), lane([[430, .1, 153], [-430, .1, 153]]), lane([[-430, .1, -33], [430, .1, -33]]), lane([[430, .1, -27], [-430, .1, -27]]), lane([[-430, .1, 247], [430, .1, 247]]), lane([[430, .1, 253], [-430, .1, 253]])];
  const ns = [lane([[-125, .1, 245], [-125, .1, -460]]), lane([[-131, .1, -460], [-131, .1, 245]]), lane([[125, .1, 245], [125, .1, -460]]), lane([[131, .1, -460], [131, .1, 245]])];
  const loop = (cx, cz, rx, rz, y, a = 0, wob = 12) => { const p = []; for (let i = 0; i <= 48; i++) { const t = i / 48 * TAU + a; p.push([cx + Math.cos(t) * rx, y + Math.sin(t * 3) * wob, cz + Math.sin(t) * rz]); } return p; };
  const brA = lane(offsetPts(BRIDGE, 3.4)), brB = lane(offsetPts(BRIDGE, 3.4), true);
  const aveAir = lane([[-30, 44, 420], [12, 42, 240], [-2, 46, 60], [10, 52, -120]]);
  /* one flyer low over the top of the street, seen as the camera drops in */
  const streetFlyer = lane([[-44, 19, 92], [-8, 12.5, 110], [14, 13, 120], [52, 20, 138]]);
  const inst = [];
  const add = (row, n, speed, side, y, sc, palette, spread = 1, mdl = 0) => { for (let i = 0; i < n; i++) inst.push({ row, ph: (i + R() * .7) / n, sp: speed * R.range(.92, 1.08), side: side + R.range(-.3, .3) * spread, y, sc: sc * R.range(.92, 1.08), col: R.pick(palette), mdl: typeof mdl === 'function' ? mdl() : mdl }); };
  const street = [[.5, .4, .06], [.05, .055, .07], [.3, .04, .05], [.05, .17, .2], [.42, .42, .44], [.09, .09, .12], [.46, .2, .04]];
  const flyer = [[.07, .08, .11], [.42, .05, .06], [.5, .42, .06], [.05, .24, .28], [.36, .36, .4]];
  const anyCar = () => R.pick([1, 1, 3, 3, 2]);
  add(rows.hwyE, 54, .018, 0, 0, 1, street, 10); add(rows.hwyW, 54, .018, 0, 0, 1, street, 10);
  inst.slice(0, 108).forEach(c => { c.side = R.chance(.5) ? R.range(-1, 1) * .8 + 1.9 : R.range(-1, 1) * .6 - 1.8; c.y = 0; });
  add(aveN, 10, .024, 1.6, 0, 1, street, 1, anyCar); add(aveN, 8, .021, -1.2, 0, 1, street, 1, anyCar); add(aveS, 10, .024, 1.6, 0, 1, street, 1, anyCar); add(aveS, 8, .021, -1.2, 0, 1, street, 1, anyCar);
  for (const r of ew) add(r, 8, .013, 0, 0, 1, street); for (const r of ns) add(r, 7, .015, 0, 0, 1, street);
  add(brA, 22, .017, 0, 0, 1, street, 6); add(brB, 22, .017, 0, 0, 1, street, 6);
  add(aveAir, 3, .03, 0, 0, 1.6, flyer, 3, 4);
  add(streetFlyer, 1, .022, 0, 0, 1.5, [[.5, .06, .06]], 0, 4); inst[inst.length - 1].ph = .5;
  /* parked along the shop's kerb: lanes that do not move */
  const kerbW = lane([[-8.1, .1, 90], [-8.1, .1, 40]]), kerbE = lane([[8.1, .1, 30], [8.1, .1, 110]]);
  [.2, .34, .62, .8].forEach((ph, i) => inst.push({ row: kerbW, ph, sp: 0, side: 0, y: 0, sc: 1, col: street[i * 2 % 7], mdl: [2, 3, 1, 2][i] }));
  [.25, .5, .72].forEach((ph, i) => inst.push({ row: kerbE, ph, sp: 0, side: 0, y: 0, sc: 1, col: street[(i * 3 + 1) % 7], mdl: [1, 3, 2][i] }));
  /* barges up high */
  const barge = lane(loop(0, -120, 520, 560, 330, 1.2, 8)); add(barge, 2, .0028, 0, 0, 6.5, [[.05, .05, .07]], 0, 4);

  /* people on the avenue, a crowd waiting at the crossing, everyone small and dark */
  const coat = [[.04, .045, .06], [.07, .06, .05], [.03, .03, .035], [.09, .03, .035], [.03, .07, .08], [.11, .11, .12]];
  const peds = []; const P = (row, n, sp, side) => { for (let i = 0; i < n; i++) peds.push({ row, ph: (i + R() * .8) / n, sp: sp * R.range(.85, 1.15), side: side + R.range(-.4, .4), y: 0, sc: R.range(.92, 1.06), col: R.pick(coat), mdl: R.int(0, 2) }); };
  const walk = (x, z0, z1) => lane([[x, .05, z0], [x, .05, z1]]);
  P(walk(-12.2, 176, 44), 16, .011, 0); P(walk(-14.6, 44, 176), 13, .012, 0); P(walk(12.4, 176, 40), 14, .011, 0); P(walk(15, 40, 176), 12, .012, 0);
  /* passes right in front of the shop window */
  P(walk(-15.6, 92, 36), 5, .018, 0);
  const crowd = (x, z, n) => { const r = lane([[x, .05, z - 3.2], [x, .05, z + 3.2]]); for (let i = 0; i < n; i++) peds.push({ row: r, ph: (i + R() * .7) / n, sp: 0, side: R.range(-1.1, 1.1), y: 0, sc: R.range(.92, 1.06), col: R.pick(coat), mdl: R.int(0, 2) }); };
  crowd(13.6, 56, 5); crowd(14.6, 70, 4); P(walk(13.2, 88, 34), 7, .02, 0); crowd(-10.2, 135.5, 11); crowd(10.2, 135.5, 11); crowd(-10.6, 115, 4); crowd(10.6, 158, 4);

  /* air lanes curve around the towers: groups of real cars with short tail-light pairs, thin beads only far away */
  const streams = []; const warm = [.85, .76, .58], cold = [.68, .78, .88], red = [.82, .1, .07], amber = [.85, .46, .12];
  const air = (pts, groups, per, speed, sc, palette, c0, c1, beads) => { const a = lane(pts), b = lane(offsetPts(pts, 8).reverse()); for (const [row, col] of [[a, c0], [b, c1]]) { for (let g = 0; g < groups; g++) { const base = (g + R() * .5) / groups; const n = R.int(1, per); for (let i = 0; i < n; i++) inst.push({ row, ph: (base + i * .004 + 1) % 1, sp: speed, side: R.range(-1.2, 1.2), y: R.range(-1, 1), sc: sc * R.range(.92, 1.08), col: R.pick(palette), mdl: 0 }); } for (let g = 0; g < beads; g++) { const base = (g + R() * .6) / beads, n = R.int(2, 5); for (let i = 0; i < n; i++) streams.push({ row, ph: (base + i * .0035 + 1) % 1, sp: speed, side: R.range(-1.4, 1.4), y: R.range(-1.2, 1.2), sc: 3.2, col }); } } };
  const pal = flyer;
  air(curvePts([[-760, 118, 300], [-330, 104, 236], [-162, 118, 90], [-150, 146, -110], [-230, 168, -300], [-640, 196, -560]], 40), 5, 3, .02, 2.2, pal, warm, red, 16);
  air(curvePts([[760, 96, 262], [300, 104, 214], [156, 128, 60], [150, 158, -130], [70, 188, -318], [-70, 206, -420], [-540, 232, -660]], 40), 5, 3, .02, 2.2, pal, cold, red, 16);
  air(curvePts([[-840, 146, 356], [-260, 168, 262], [160, 150, 250], [820, 178, 360]], 30), 5, 3, .018, 2.2, pal, warm, red, 16);
  air(curvePts([[-90, 92, 420], [-62, 96, 150], [-104, 118, -40], [-96, 150, -120], [-60, 172, -300], [-40, 186, -600]], 36), 4, 3, .022, 2, pal, cold, red, 14);
  air(curvePts([[100, 80, 420], [76, 92, 130], [112, 112, -40], [104, 136, -130], [64, 158, -320], [80, 170, -620]], 36), 4, 3, .022, 2, pal, warm, red, 14);
  air(loop(0, -235, 118, 128, 178, 0, 18), 4, 2, .016, 2, pal, cold, amber, 12);
  air(loop(0, -235, 96, 104, 292, 1, 14), 3, 2, .014, 1.9, pal, warm, red, 10);
  air(loop(0, -235, 74, 80, 420, 2, 10), 2, 2, .012, 1.8, pal, cold, red, 8);
  /* close to the opening camera: silhouettes you can read */
  const nearA = lane(loop(26, 286, 270, 26, 84, 0, 6)), nearB = lane(loop(44, 262, 300, 22, 122, 2, 8));
  add(nearA, 8, .019, 0, 0, 2.2, flyer, 0, 4); add(nearB, 8, .016, 0, 0, 1.9, flyer, 0, 4);
  return { inst, peds, streams };
}
function buildTraffic({ inst, peds, streams }) {
  const lanes = buildLaneTexture(); TEX.lanes = lanes; S.carCount = inst.length;
  const shared = city.u;
  const fsU = () => ({ uLanes: { value: lanes }, uTime: TIME, uMY: { value: .2 }, uMoon: shared.uMoon, uAmbHi: shared.uAmbHi, uAmbLo: shared.uAmbLo, uFogHi: shared.uFogHi, uFogLo: shared.uFogLo, uFogD: shared.uFogD, uFogH: shared.uFogH, uPoolR: shared.uPoolR, uPoolK: shared.uPoolK, uPool: shared.uPool, uSky: shared.uSky, uMoonC: shared.uMoonC, uSkyH: shared.uSkyH, uSkyZ: shared.uSkyZ });
  const wire = (g, list) => { const iLane = new Float32Array(list.length * 4), iLook = new Float32Array(list.length * 4), iH = new Float32Array(list.length); list.forEach((c, i) => { iLane.set([c.row, c.ph, c.sp, c.side], i * 4); iLook.set([c.col[0], c.col[1], c.col[2], c.sc], i * 4); iH[i] = c.y; }); g.setAttribute('iLane', new THREE.InstancedBufferAttribute(iLane, 4)); g.setAttribute('iLook', new THREE.InstancedBufferAttribute(iLook, 4)); g.setAttribute('iH', new THREE.InstancedBufferAttribute(iH, 1)); g.instanceCount = list.length; return g; };
  const meshFor = (base, list, defs = {}) => { const ig = new THREE.InstancedBufferGeometry(); for (const k of ['position', 'normal', 'aCol']) ig.setAttribute(k, base.getAttribute(k)); wire(ig, list); const m = new THREE.Mesh(ig, new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: CAR_VS, fragmentShader: CAR_FS, uniforms: fsU(), defines: defs, blending: THREE.NoBlending, side: THREE.DoubleSide })); m.frustumCulled = false; return m; };
  const models = [carLow(), carModel('muscle'), carModel('cab'), carModel('sedan'), flyerModel()];
  inst.forEach(c => { if (c.mdl === 2) c.col = [.62, .5, .05]; });
  const bodies = models.map((g, k) => meshFor(g, inst.filter(c => c.mdl === k)));
  /* people: eight cuts, dealt from their own random stream so the rest of the traffic stays where it was */
  const GR = rng(9091), cast = [0, 1, 2, 3, 5, 7, 0, 1, 2, 3, 4, 5, 6, 7], cloth = [[.13, .16, .3], [.32, .1, .15], [.08, .25, .28], [.36, .3, .2], [.2, .13, .34], [.34, .35, .42], [.06, .06, .08], [.48, .16, .1], [.46, .42, .44], [.1, .2, .17]];
  peds.forEach(c => {
    c.mdl = GR.pick(cast); c.col = GR.pick(cloth);
    const pts = LANES[c.row]; let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]);
    const v = len * c.sp; c.A = v > 0 ? Math.min(.5, Math.max(.3, .17 + v * .17)) : 0;
    c.gw = v > 0 ? Math.PI * v / (2 * .85 * Math.sin(c.A)) / c.sc : 0; c.ph0 = GR() * TAU;
    /* waiting people face the road, those further along stand about at any angle */
    c.yaw = v > 0 ? 0 : Math.abs(pts[0][0]) < 11 ? -Math.sign(pts[0][0]) * Math.PI / 2 + GR.range(-.35, .35) : GR() * TAU;
  });
  const pedM = [0, 1, 2, 3, 4, 5, 6, 7].map(v => pedModel(v));
  const pedMesh = (g, k) => { const list = peds.filter(c => c.mdl === k), m = meshFor(g, list, { WALK: 1 }), ig = m.geometry, a = new Float32Array(list.length * 4); list.forEach((c, i) => a.set([c.gw, c.A, c.yaw, c.ph0], i * 4)); ig.setAttribute('aRig', g.getAttribute('aRig')); ig.setAttribute('iGait', new THREE.InstancedBufferAttribute(a, 4)); return m; };
  const people = pedM.map(pedMesh);
  /* the same walkers without umbrellas, swapped in when it's dry (skyTick) */
  const umb = [4, 6].map(k => { const dry = pedMesh(pedModel(k, true), k); dry.visible = false; return { wet: people[k], dry }; });
  people.push(...umb.map(u => u.dry));
  /* lamps, tail lights and their streaks on the road */
  const parts = []; for (let k = 0; k < 4; k++) parts.push(-.5, -.5, k, .5, -.5, k, .5, .5, k, -.5, -.5, k, .5, .5, k, -.5, .5, k);
  const qg = new THREE.InstancedBufferGeometry(); qg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(parts), 3)); wire(qg, inst);
  const mk = (defs) => new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: CARGLOW_VS, fragmentShader: CARGLOW_FS, defines: defs, uniforms: { uLanes: { value: lanes }, uTime: TIME, uMY: { value: .2 }, uLamp: SKY_U.lamp }, ...addBlend, side: THREE.DoubleSide });
  const lights = new THREE.Mesh(qg, mk({})); lights.frustumCulled = false;
  const mirLights = new THREE.Mesh(qg, mk({ MIRROR: 1 })); mirLights.frustumCulled = false;
  /* streams */
  const sg = new THREE.InstancedBufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, -.5, 0, .5, .5, 0, -.5, .5, 0]), 3)); wire(sg, streams);
  const flow = new THREE.Mesh(sg, new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: STREAM_VS, fragmentShader: STREAM_FS, uniforms: { uLanes: { value: lanes }, uTime: TIME, uLamp: SKY_U.lamp }, ...addBlend, side: THREE.DoubleSide })); flow.frustumCulled = false;
  return { cars: [...bodies, ...people], lights, mirLights, flow, umb };
}
function buildRain() {
  const n = isPhone ? 900 : 1600; const R = rng(5);
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 0, 0, 1, 1, 0, -1, 1, 0]), 3));
  const a = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) a[i] = R(); g.setAttribute('iR', new THREE.InstancedBufferAttribute(a, 4)); g.instanceCount = n;
  const m = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: RAIN_VS, fragmentShader: RAIN_FS, uniforms: { uTime: TIME, uRainBox: { value: 60 }, uRainC: { value: new THREE.Color(.55, .55, .75) }, uCut: { value: new THREE.Vector4(0, 0, 0, 1) }, uRainK: SKY_U.rainK }, ...addBlend, side: THREE.DoubleSide, depthTest: true });
  const me = new THREE.Mesh(g, m); me.frustumCulled = false; me.userData.n = n; return me;
}

async function initGraphics() {
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, depth: false, powerPreference: 'high-performance' }); }
  catch (e) { FAIL('WebGL did not start on this device.'); throw e; }
  if (!renderer.capabilities.isWebGL2) { FAIL('The city needs WebGL 2.'); throw new Error('webgl2'); }
  /* a phone can drop the context in the background: wait, then rebuild what only lived on the GPU */
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); S.lost = true; APP.log('webgl context lost'); });
  /* back again: the programs are rebuilt off the GPU's main thread before anything draws, or the rebuild itself can stall it into another loss */
  canvas.addEventListener('webglcontextrestored', async () => { try { bakeShadows(); } catch (e) { APP.log(e); } try { resize(); } catch (e) { APP.log(e); } try { await warmShaders(); } catch (e) { APP.log(e); } S.lost = false; });
  renderer.debug.checkShaderErrors = RIG;   /* only the test rig: checking costs compile time and the look is settled */
  renderer.autoClear = false; renderer.info.autoReset = false; renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  THREE.ColorManagement.enabled = false;
  CAM = new THREE.PerspectiveCamera(55, 1, 3, 13000); CAM.rotation.order = 'YXZ';
  setBoot('Painting walls', .1); await yieldFrame();
  TEX.tiles = paintTiles(isPhone ? 256 : 512);
  setBoot('Lettering signs', .2); await yieldFrame();
  TEX.signs = drawSigns(); TEX.ads = drawAds();
  setBoot('Laying out streets', .3); await yieldFrame();
  /* world before pool texture: builders pour light as they go */
  const gWorld = buildCityWorld();
  setBoot('Raising the far shore', .5); await yieldFrame();
  const gFar = buildFarWorld(); const gFx = buildCityFx();
  TEX.pool = drawPools();
  city.u = worldUniforms(false); city.mat = worldMat(city.u);
  const ex = SHOP.x + SHOP.w / 2;
  city.lightList = [
    [0, 0, 0, 0, -1, 0],
    [ex + 2.2, 3.4, SHOP.z, 0xffc98a, 16, .95], [-12, 7, 110, PAL.red, 34, .85], [12, 8, 36, PAL.cyan, 34, .8], [0, 16, 200, PAL.yellow, 46, .5],
    [195, 26, 195, PAL.red, 130, .55], [290, 22, -112, PAL.orange, 120, .6], [-280, 34, 44, PAL.cyan, 150, .5],
  ];
  setLights(city.u, city.lightList);
  city.mirrorU = { ...city.u, uReflOn: { value: 0 } }; city.mirrorMat = worldMat(city.mirrorU, { MIRROR: 1 }, THREE.BackSide);
  const skyG = new THREE.IcosahedronGeometry(100, 2);
  const skyU = { uMoonDir: { value: moonSkyDir }, uShaft: { value: SHAFTS.map(() => new THREE.Vector3(0, 1, 0)) }, uTime: TIME, uTiles: { value: TEX.tiles }, uMY: { value: 0 },
    uSky: SKY_U.look, uSunDir: SKY_U.sun, uSunC: SKY_U.sunC, uSkyH: SKY_U.skyH, uSkyZ: SKY_U.skyZ, uHazeC: SKY_U.haze, uCloudB: SKY_U.cloudB, uCloudR: SKY_U.cloudR }; city.skyU = skyU;
  const skyM = (d, side) => new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: skyU, defines: d, side, depthWrite: false, depthTest: true, blending: THREE.NoBlending });
  const sky = new THREE.Mesh(skyG, skyM({}, THREE.BackSide)); sky.frustumCulled = false; sky.renderOrder = -10;
  const skyMir = new THREE.Mesh(skyG, skyM({ MIRROR: 1 }, THREE.FrontSide)); skyMir.frustumCulled = false; skyMir.renderOrder = -10;

  /* water: one big plate */
  const W = new MB(8); W.set({ kind: K.CUT, c: 0x0d1a2b, id: 0 }); const SEA = 9000; W.quad([-SEA, -2, SEA], [SEA, -2, SEA], [SEA, -2, -SEA], [-SEA, -2, -SEA]); const gWater = W.geom();
  const world = new THREE.Mesh(gWorld, city.mat), far = new THREE.Mesh(gFar, city.mat), water = new THREE.Mesh(gWater, city.mat);
  [world, far, water].forEach(m => m.frustumCulled = false);
  const worldCells = splitCells(gWorld, 280).map(g => new THREE.Mesh(g, city.mat));
  const glows = city.glow = buildGlowMesh(GLOW); city.glowList = GLOW.length;
  const fx = new THREE.Mesh(gFx, new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: FX_VS, fragmentShader: FX_FS, uniforms: { uTime: TIME, uAds: { value: TEX.ads }, uDayFx: SKY_U.dayFx }, ...addBlend, side: THREE.DoubleSide })); fx.frustumCulled = false;
  setBoot('Starting traffic', .6); await yieldFrame();
  const tr = buildTraffic(trafficSetup()); city.umb = tr.umb;
  const rain = city.rain = buildRain();
  const tGeo = trainCar(); city.train = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(tGeo, city.mat); m.frustumCulled = false; city.train.push(m); }
  /* the giant koi: one clean silhouette swimming up past the tower */
  { const nu = 44, nv = 4, pos = [], idx = []; for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) pos.push(i / nu, j / nv, 0); for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setIndex(idx);
    city.koi = new THREE.Mesh(g, new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: HOLO_VS, fragmentShader: HOLO_FS, uniforms: { uTime: TIME, uTex: { value: koiTexture() }, uHolo: { value: new THREE.Vector3(-46, 318, -168) }, uHoloL: { value: 178 } }, ...addBlend, side: THREE.DoubleSide })); city.koi.frustumCulled = false; }
  SC.city = new THREE.Scene(); SC.city.add(sky, ...worldCells, far, water, ...tr.cars, ...city.train, tr.flow, tr.lights, glows, fx, city.koi, rain);
  city.world = world; city.far = far; city.water = water;
  /* the reflection pass reuses geometry through a cheaper variant */
  const wMir = new THREE.Mesh(mirrorSubset(gWorld), city.mirrorMat), fMir = new THREE.Mesh(gFar, city.mirrorMat); wMir.frustumCulled = fMir.frustumCulled = false;
  const gMir = city.glowMir = buildGlowMesh(GLOW, { MIRROR: 1 }); gMir.material.side = THREE.DoubleSide;
  SC.mirror = new THREE.Scene(); SC.mirror.add(skyMir, wMir, fMir, gMir, tr.mirLights);
  setBoot('Dressing the shop', .7); await yieldFrame();
  /* the shell every room is loaded into: these meshes and materials live for the whole session */
  room.u = worldUniforms(true); room.mat = worldMat(room.u);
  room.mirU = { ...room.u, uShadowOn: { value: 0 }, uClipZ: { value: 0 } };
  const mm = worldMat(room.mirU, { ROOMMIR: 1 }, THREE.BackSide), blank = m => { const x = new THREE.Mesh(new THREE.BufferGeometry(), m); x.frustumCulled = false; return x; };
  room.u.uTill.value.set(...CELL.till); city.u.uTill.value.set(...CELL.till);
  room.mesh = blank(room.mat); room.door = blank(room.mat); room.clutter = blank(room.mat);
  /* the tri-fold mirror reflects the real room: same geometry, seen from the other side of the glass */
  room.mirMesh = blank(mm); room.mirBack = blank(mm); SC.roomMir = new THREE.Scene(); SC.roomMir.add(room.mirMesh, room.mirBack);
  room.fx = blank(new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: FX_VS, fragmentShader: FX_FS, uniforms: { uTime: TIME, uAds: { value: TEX.ads }, uDayFx: { value: 0 } }, ...addBlend, side: THREE.DoubleSide }));
  room.glowMesh = buildGlowMesh([]); room.glowMesh.material.uniforms.uGlowK.value = .9;
  room.glassU = { uBg: { value: null }, uSigns: { value: TEX.signs }, uTiles: { value: TEX.tiles }, uTime: TIME, uInside: { value: 0 }, uDrops: SKY_U.drops, uSky: SKY_U.sky, uRes: { value: new THREE.Vector2(1, 1) }, uMY: { value: 0 } };
  room.glassMat = new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: GLASS_VS, fragmentShader: GLASS_FS, uniforms: room.glassU, side: THREE.DoubleSide, transparent: true, depthWrite: false, blending: THREE.NormalBlending });
  room.glassMat.blending = THREE.CustomBlending; room.glassMat.blendSrc = THREE.SrcAlphaFactor; room.glassMat.blendDst = THREE.OneMinusSrcAlphaFactor; room.glassMat.blendSrcAlpha = THREE.ZeroFactor; room.glassMat.blendDstAlpha = THREE.OneFactor;
  room.glass = blank(room.glassMat); room.glass.renderOrder = 5;
  room.doorGlass = blank(room.glassMat); room.doorGlass.renderOrder = 5;
  SC.room = new THREE.Scene(); SC.room.add(room.mesh, room.door, room.glass, room.doorGlass, room.fx, room.glowMesh, room.clutter);
  /* a room inside a solid block is seen from outside through its window: this quad draws no colour, it only pushes the city's depth back so the room can show in that one shape */
  room.hole = blank(new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: 'in vec3 position; uniform mat4 modelViewMatrix, projectionMatrix; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position.z = 0.; }', fragmentShader: 'precision highp float; layout(location=0) out vec4 O; void main(){ O = vec4(0.); gl_FragDepth = 1.; }', side: THREE.DoubleSide, colorWrite: false, depthFunc: THREE.AlwaysDepth })); SC.hole = new THREE.Scene(); SC.hole.add(room.hole);
  loadRoom('shop');
  /* passes */
  setBoot('Sharpening ink', .82); await yieldFrame();
  MAT.bright = fsPass(BRIGHT_FS, { t: { value: null }, px: { value: new THREE.Vector2() }, th: { value: .86 } });
  MAT.blur = fsPass(BLUR_FS, { t: { value: null }, dir: { value: new THREE.Vector2() } });
  MAT.post = fsPass(POST_FS, { tC: { value: null }, tD: { value: null }, tB: { value: null }, tB2: { value: null }, px: { value: new THREE.Vector2() }, nearZ: { value: 1 }, farZ: { value: 1 }, uTime: TIME, uGlitch: { value: 0 }, uScan: { value: 0 }, uInkW: { value: 1 }, uInkOn: { value: 1 }, uBloom: { value: .9 }, uFade: { value: 1 }, uGrain: { value: 0 } });
  MAT.aa = fsPass(AA_FS, { t: { value: null }, px: { value: new THREE.Vector2() }, uTime: TIME, uFade: { value: 1 }, uGrain: { value: Q.grain } });
  WEAK = weakGpu(); perfPick(perf().pick);
  resize();
  /* shadows: one sharp bake per scene */
  bakeShadows();
  setBoot('Warming shaders', .92); await yieldFrame();
  await warmShaders();
}
/* every program at once, compiled in the background where the browser can (parallel compile): on a laptop's Intel chip the world
   shader takes seconds per variant, and compiling them back to back on the GPU's main thread trips the browser's watchdog,
   which drops the context (a white screen). Nothing asks a program for its status until it says it's done. */
function warmShaders() {
  const passes = Object.values(MAT).filter(p => p && p.s && p.s.isScene).map(p => p.s);
  return Promise.all([SC.city, SC.mirror, SC.room, SC.hole, ...passes].map(sc => renderer.compileAsync(sc, CAM)));
}

let depthMat = null;
function bake(geoms, cam, size, u, keep) {
  depthMat = depthMat || new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: DEPTH_VS, fragmentShader: DEPTH_FS, side: THREE.DoubleSide, colorWrite: false });
  let rt = keep && keep.shadowRT;
  if (!rt) {
    rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: true, stencilBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    rt.depthTexture = new THREE.DepthTexture(size, size, THREE.UnsignedIntType); rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter;
    if (keep) keep.shadowRT = rt;
  }
  const s = new THREE.Scene(); geoms.forEach(g => { const m = new THREE.Mesh(g, depthMat); m.frustumCulled = false; s.add(m); });
  renderer.setRenderTarget(rt); renderer.setClearColor(0xffffff, 1); renderer.clear(true, true, false); renderer.render(s, cam); renderer.setRenderTarget(null);
  cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  u.uShadow.value = rt.depthTexture; u.uShadowM.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); u.uShadowOn.value = 1;
}
function bakeRoom() {
  const k = room.lights[0], pc = new THREE.PerspectiveCamera(room.def.shadow[0], 1, .3, room.def.shadow[1]);
  pc.position.set(k[0], k[1], k[2]); pc.up.set(1, 0, 0); pc.lookAt(k[0], 0, k[2]); pc.updateMatrixWorld(); pc.updateProjectionMatrix();
  bake(room.clutterGeom && room.clutter.visible ? [room.geom, room.clutterGeom] : [room.geom], pc, 2048, room.u, room);
}
function bakeCity() {
  /* from the moon, or the sun by day (SKY.key) */
  const size = isPhone ? 1024 : 2048, k = SKY.key;
  const mc = new THREE.OrthographicCamera(-760, 760, 760, -760, 10, 2600);
  mc.position.set(k.x * 1200, k.y * 1200 + 100, k.z * 1200 - 90); mc.lookAt(0, 60, -90); mc.updateMatrixWorld(); mc.updateProjectionMatrix();
  bake([city.world.geometry], mc, size, city.u, city);
}
function bakeShadows() {
  bakeCity();
  bakeRoom();
}

/* ---------- a figure from a model file: key poses by bone names, skinned live, drawn in the window's light ----------
   The file is private like Dex's (KV, never in git). If it can't be fetched the room simply has no one in it.
   A spot has a few key poses. She breathes and looks about a little, and every minute or so moves into another:
   a short blend when it's a shift where she is, a digital blink when getting there would cross the furniture. */
const FIG_VS = /* glsl */`
#include <skinning_pars_vertex>
out vec3 vW; out vec3 vN; out vec2 vU;
void main(){
  vec3 objectNormal = vec3(normal);
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  vec3 transformed = vec3(position);
  #include <skinning_vertex>
  vec4 w=modelMatrix*vec4(transformed,1.); vW=w.xyz; vN=mat3(modelMatrix)*objectNormal; vU=uv; gl_Position=projectionMatrix*viewMatrix*w; }`;
const FIG_FS = /* glsl */`
in vec3 vW; in vec3 vN; in vec2 vU; layout(location=0) out vec4 O;
uniform sampler2D map; uniform vec3 uBase; uniform float uHasMap, uHair, uId, uEm, uCut, uDay; uniform vec4 uPh;
void main(){
  /* the blink: a scan line takes her away from the top down, and brings her back from her feet up */
  if(vW.y>uCut) discard;
  vec4 t=uHasMap>.5?texture(map,vU):vec4(1.); if(t.a<.45) discard;
  vec3 c=t.rgb*uBase;
  /* hair goes near-black, its painted highlights turn magenta */
  if(uHair>.5){ float l=dot(t.rgb,vec3(.3,.59,.11)); c=mix(vec3(.04,.032,.065),vec3(.15,.11,.22),smoothstep(.12,.55,l)); c=mix(c,vec3(1.,.24,.62),smoothstep(.62,.9,l)*.9); }
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N; vec3 V=normalize(cameraPosition-vW);
  /* the city is the light: pink from one side of the glass, blue from the other, in hard anime steps */
  float a=max(dot(N,normalize(vec3(1.,.15,-.55))),0.), b=max(dot(N,normalize(vec3(1.,.35,.6))),0.);
  a=smoothstep(.12,.2,a)*.55+smoothstep(.5,.58,a)*.45; b=smoothstep(.12,.2,b)*.55+smoothstep(.5,.58,b)*.45;
  /* and a soft violet from the room behind the viewer, so whoever faces in still has a face */
  float f=max(dot(N,normalize(vec3(-1.,.5,-.2))),0.); f=smoothstep(.1,.25,f)*.6+smoothstep(.55,.65,f)*.4;
  vec3 L=vec3(.24,.2,.36)+vec3(1.,.3,.6)*a*.85+vec3(.3,.66,1.)*b*.7+vec3(.62,.5,.85)*f*.55;
  /* by day the glass gives plain daylight, the same hard steps */
  L=mix(L,vec3(.36,.36,.4)+vec3(1.,.95,.86)*a*.9+vec3(.8,.88,1.)*b*.55+vec3(.55,.53,.56)*f*.5,uDay);
  /* her phone: a cold light from just in front of her face */
  if(uPh.w>0.){ vec3 d=uPh.xyz-vW; L+=vec3(.42,.7,1.)*uPh.w*max(dot(N,normalize(d)),0.)*smoothstep(.7,.05,length(d)); }
  float r=smoothstep(.55,.75,pow(1.-max(dot(N,V),0.),1.6));
  vec3 rim=mix(mix(vec3(1.,.28,.6),vec3(.35,.82,1.),smoothstep(-.2,.2,N.z)),vec3(.8,.82,.86),uDay*.8)*r;
  vec3 col=uEm>.5?uBase:c*L+rim*.75;
  if(vW.y>uCut-.04) col=vec3(.35,.95,1.);
  O=vec4(col,uId/255.);
}`;
let FIG = null, figTok = 0, figP = null, HOUR = null;
const FIG_PH = { value: new THREE.Vector4() }, FIG_CUT = { value: 1e4 }, FIG_DAY = { value: 0 };
/* where she is by the clock: the window corner by day, the glass from six, in bed from eleven. Read on the way in, so she never changes spot while the room is on screen */
const figSpot = () => { const h = HOUR != null ? HOUR : new Date().getHours(); return h >= 23 || h < 6 ? 'late' : h >= 18 ? 'eve' : 'day'; };
/* on a phone the resting view may turn toward her spot (the bed sits at the edge of a narrow screen) */
const restYaw = () => CAM.aspect < .8 && room.def && (room.def.figure && room.def.figure.turn && room.def.figure.turn[room.spot] || room.def.turn) || 0;
function dropFigure() {
  figTok++; figP = null; if (!FIG) return; SC.room.remove(FIG.root);
  /* what she holds may never have been handed to her, so it's gathered on its own */
  const all = new Set(), maps = new Set(); FIG.root.traverse(o => all.add(o)); for (const g of Object.values(FIG.props)) g.traverse(o => all.add(o));
  for (const o of all) { if (o.isSkinnedMesh) o.skeleton.dispose(); if (o.geometry) o.geometry.dispose(); for (const m of [].concat(o.material || [])) { if (m.uniforms.map.value) maps.add(m.uniforms.map.value); m.dispose(); } }
  maps.forEach(m => m.dispose()); FIG = null; FIG_PH.value.set(0, 0, 0, 0); FIG_CUT.value = 1e4;
}

/* her key poses, from her rest pose. Directions are in her own frame (+Y up, +X her left, +Z her front) and absolute,
   whatever came before; turn the hips before aiming the limbs. An arm that ends low swings forward first, then down: one
   swing from the T leaves the palm on its side. A spot's lay then turns her whole body (onto her back, her side).
   Each was checked by skinning it against the furniture: what rests on something sinks 0-4 cm into it, nothing else touches */
const FIG_POSES = {
  /* evening, at the glass: one hand on her hip, the other arm loose, weight on one leg */
  stand: ({ aim, bone, V }) => {
    aim(bone('l', 'up'), bone('l', 'lo'), V(.18, -1, -.04)); aim(bone('l', 'lo'), bone('l', 'hand'), V(.05, -1, .18));
    aim(bone('r', 'up'), bone('r', 'lo'), V(-.5, -.82, -.2)); aim(bone('r', 'lo'), bone('r', 'hand'), V(.62, -.6, .2));
    aim(bone('l', 'leg'), bone('l', 'shin'), V(.07, -1, 0)); aim(bone('r', 'leg'), bone('r', 'shin'), V(-.12, -1, .03));
  },
  /* looking out, her back three-quarters to the room, a palm flat on the glass at head height, weight on her left leg */
  glassLook: ({ aim, turn, bone, B, V }) => {
    turn(B('spine'), V(.819, 0, -.574), .06);
    aim(bone('l', 'leg'), bone('l', 'shin'), V(-.03, -1, 0));
    aim(bone('r', 'leg'), bone('r', 'shin'), V(-.01, -1, .1)); aim(bone('r', 'shin'), bone('r', 'foot'), V(-.03, -1, -.08));
    aim(bone('l', 'up'), bone('l', 'lo'), V(.601, -.225, .767)); aim(bone('l', 'lo'), bone('l', 'hand'), V(.481, .391, .785)); aim(bone('l', 'hand'), bone('l', 'mid'), V(.068, .993, .098));
    aim(bone('r', 'up'), bone('r', 'lo'), V(-.28, -1, -.03)); aim(bone('r', 'lo'), bone('r', 'hand'), V(-.17, -1, .12));
  },
  /* on the window step, her side to the glass: one leg along the step, the other knee up, the phone in both hands */
  stepSit: ({ aim, turn, twist, bone, B, neck, head, top, V }) => {
    turn(B('spine'), V(1, 0, 0), .06);
    aim(neck, head, V(0, .9, .44)); aim(head, top, V(0, .85, .53));
    aim(bone('l', 'leg'), bone('l', 'shin'), V(-.03, .5, .866)); aim(bone('r', 'leg'), bone('r', 'shin'), V(.02, .04, 1));
    aim(bone('l', 'shin'), bone('l', 'foot'), V(0, -.512, .859)); aim(bone('r', 'shin'), bone('r', 'foot'), V(.02, -.16, 1));
    aim(bone('l', 'up'), bone('l', 'lo'), V(.2, -.5, 1)); aim(bone('l', 'up'), bone('l', 'lo'), V(.192, -.475, .859)); twist(bone('l', 'up'), bone('l', 'lo'), -.3);
    aim(bone('l', 'lo'), bone('l', 'hand'), V(-.566, .315, .761)); twist(bone('l', 'lo'), bone('l', 'hand'), -.3); aim(bone('l', 'hand'), bone('l', 'mid'), V(-.301, .531, .792)); twist(bone('l', 'hand'), bone('l', 'mid'), -.29);
    aim(bone('r', 'up'), bone('r', 'lo'), V(-.2, -.5, 1)); aim(bone('r', 'up'), bone('r', 'lo'), V(-.331, -.491, .806)); twist(bone('r', 'up'), bone('r', 'lo'), .3);
    aim(bone('r', 'lo'), bone('r', 'hand'), V(.486, .325, .811)); twist(bone('r', 'lo'), bone('r', 'hand'), .3); aim(bone('r', 'hand'), bone('r', 'mid'), V(.301, .531, .792)); twist(bone('r', 'hand'), bone('r', 'mid'), .4);
  },
  /* daytime, in the window corner: a stretch on the floor facing the room, arms overhead, fingers laced. Each arm swings
     forward, then up, then twists, so the palms face in and the elbows don't lock */
  dayStretch: ({ aim, twist, bone, head, top, V }) => {
    aim(bone('l', 'leg'), bone('l', 'shin'), V(0, -1, .06)); aim(bone('l', 'shin'), bone('l', 'foot'), V(0, -1, .03));
    aim(bone('r', 'leg'), bone('r', 'shin'), V(.01, -1, -.01)); aim(bone('r', 'shin'), bone('r', 'foot'), V(.01, -1, 0));
    aim(head, top, V(0, .99, .1));
    aim(bone('l', 'up'), bone('l', 'lo'), V(.1, 0, 1)); aim(bone('l', 'up'), bone('l', 'lo'), V(.28, .95, .06)); twist(bone('l', 'up'), bone('l', 'lo'), -.6);
    aim(bone('l', 'lo'), bone('l', 'hand'), V(-.43, .9, .08)); aim(bone('l', 'hand'), bone('l', 'mid'), V(-.78, .6, .1));
    aim(bone('r', 'up'), bone('r', 'lo'), V(-.1, 0, 1)); aim(bone('r', 'up'), bone('r', 'lo'), V(-.28, .95, .06)); twist(bone('r', 'up'), bone('r', 'lo'), .6);
    aim(bone('r', 'lo'), bone('r', 'hand'), V(.43, .9, .08)); aim(bone('r', 'hand'), bone('r', 'mid'), V(.78, .6, .1));
  },
  /* on the window step, her hip against the glass (her hair is too long to lean back on it), legs down to the floor, a
     tablet in both hands by its short sides, head bowed to it */
  dayRead: ({ aim, turn, arms, bone, B, hips, neck, head, top, V }) => {
    turn(hips, V(1, 0, 0), .12); turn(B('spine'), V(0, 0, 1), -.06);
    aim(neck, head, V(0, .85, .53)); aim(head, top, V(0, .6, .8));
    aim(bone('l', 'leg'), bone('l', 'shin'), V(-.02, 0, 1)); aim(bone('r', 'leg'), bone('r', 'shin'), V(.02, 0, 1));
    aim(bone('l', 'shin'), bone('l', 'foot'), V(-.02, -.501, 1)); aim(bone('r', 'shin'), bone('r', 'foot'), V(.02, -.501, 1));
    aim(bone('l', 'foot'), bone('l', 'toe'), V(0, .55, .83)); aim(bone('r', 'foot'), bone('r', 'toe'), V(0, .55, .83));
    arms([[.25, -.95, .15]], [-.1, .25, 1], [-.32, .1, .95]);
  },
  /* standing on the step, a shoulder on the glass, ankles crossed, the other arm loose along it, the phone low in one hand */
  dayLean: ({ aim, turn, twist, bone, hips, neck, head, top, V }) => {
    turn(hips, V(0, 0, 1), -.08);
    aim(bone('l', 'leg'), bone('l', 'shin'), V(-.084, -.993, .087)); aim(bone('l', 'shin'), bone('l', 'foot'), V(-.084, -.983, -.164));
    aim(bone('r', 'leg'), bone('r', 'shin'), V(.06, -.93, .36)); aim(bone('r', 'shin'), bone('r', 'foot'), V(.342, -.939, -.042));
    aim(bone('r', 'foot'), bone('r', 'toe'), V(.12, -.97, .2));
    aim(neck, head, V(0, .87, .47)); aim(head, top, V(0, .66, .75));
    aim(bone('l', 'up'), bone('l', 'lo'), V(.19, -1, .07)); aim(bone('l', 'lo'), bone('l', 'hand'), V(.14, -1, .2)); aim(bone('l', 'hand'), bone('l', 'mid'), V(.1, -1, .15));
    aim(bone('r', 'up'), bone('r', 'lo'), V(-.3, -.93, .12));
    aim(bone('r', 'lo'), bone('r', 'hand'), V(.2, .12, .97)); twist(bone('r', 'lo'), bone('r', 'hand'), .6);
    aim(bone('r', 'hand'), bone('r', 'mid'), V(.12, .6, .79)); twist(bone('r', 'hand'), bone('r', 'mid'), .5);
  },
  /* late, on her back (with lay), propped a little on the pillow, legs together, one knee a little up, the phone over her face */
  lie: ({ aim, turn, twist, arms, bone, B, hips, neck, head, top, V }) => {
    turn(hips, V(1, 0, 0), -.25); turn(B('spine'), V(1, 0, 0), .35); turn(B('spine2'), V(1, 0, 0), .4);
    aim(neck, head, V(0, .94, .35)); aim(head, top, V(0, .86, .51));
    aim(bone('l', 'leg'), bone('l', 'shin'), V(.02, -1, .06)); aim(bone('l', 'shin'), bone('l', 'foot'), V(0, -1, -.08));
    aim(bone('r', 'leg'), bone('r', 'shin'), V(-.02, -.97, .22)); aim(bone('r', 'shin'), bone('r', 'foot'), V(.01, -.97, -.24));
    arms([[.45, -.45, .77]], [-.72, .12, .68], [-.3, .78, .55]);
    twist(bone('l', 'hand'), bone('l', 'mid'), -.35); twist(bone('r', 'hand'), bone('r', 'mid'), .35);
  },
  /* on her left side (with lay), facing the room, knees bent together, the phone upright in her top hand */
  sideLie: ({ aim, turn, twist, bone, B, neck, head, top, V }) => {
    turn(B('spine'), V(1, 0, 0), .08);
    aim(neck, head, V(-.17, .95, .2)); aim(head, top, V(-.22, .93, .3));
    aim(bone('l', 'leg'), bone('l', 'shin'), V(.05, -.75, .66)); aim(bone('l', 'shin'), bone('l', 'foot'), V(-.03, -.95, -.3));
    aim(bone('r', 'leg'), bone('r', 'shin'), V(.25, -.7, .67)); aim(bone('r', 'shin'), bone('r', 'foot'), V(.01, -.95, -.32));
    aim(bone('l', 'up'), bone('l', 'lo'), V(0, 1, 0)); aim(bone('l', 'up'), bone('l', 'lo'), V(.082, -.156, .984));
    aim(bone('l', 'lo'), bone('l', 'hand'), V(0, .7, .7)); aim(bone('l', 'lo'), bone('l', 'hand'), V(-.108, -.873, .476)); aim(bone('l', 'hand'), bone('l', 'mid'), V(.255, -.917, .306));
    aim(bone('r', 'up'), bone('r', 'lo'), V(0, -1, .1)); aim(bone('r', 'up'), bone('r', 'lo'), V(.033, -.168, .985));
    aim(bone('r', 'lo'), bone('r', 'hand'), V(0, -1, 0)); aim(bone('r', 'lo'), bone('r', 'hand'), V(.643, .408, .649)); aim(bone('r', 'hand'), bone('r', 'mid'), V(-.25, .968, 0));
    twist(bone('r', 'hand'), bone('r', 'mid'), .3);
  },
  /* sitting up against the headboard, legs out together, the phone in both hands, elbows out at her sides */
  headboardSit: ({ aim, turn, arms, bone, hips, neck, head, top, V }) => {
    turn(hips, V(1, 0, 0), -.4);
    aim(neck, head, V(0, .78, .65)); aim(head, top, V(0, .66, .75));
    aim(bone('l', 'leg'), bone('l', 'shin'), V(-.02, .04, 1)); aim(bone('l', 'shin'), bone('l', 'foot'), V(-.03, -.2, 1)); aim(bone('l', 'foot'), bone('l', 'toe'), V(.12, .55, .82));
    aim(bone('r', 'leg'), bone('r', 'shin'), V(.02, -.08, 1)); aim(bone('r', 'shin'), bone('r', 'foot'), V(.02, -.12, 1)); aim(bone('r', 'foot'), bone('r', 'toe'), V(-.15, .5, .85));
    arms([[.323, -.626, .71]], [-.531, -.125, .838], [-.401, .551, .732]);
  },
  /* close up, at the glass, facing him. She knows he's there: a wave hello, hands on her hips, arms folded, and the model's
     poses (a hand back in her hair, a look over her shoulder). Waist up in the frame; confident, nothing more */
  closeWave: ({ aim, twist, bone, neck, head, V }) => {
    aim(bone('l', 'leg'), bone('l', 'shin'), V(.07, -1, 0)); aim(bone('r', 'leg'), bone('r', 'shin'), V(-.12, -1, .03));
    aim(bone('l', 'up'), bone('l', 'lo'), V(.5, -.82, -.2)); aim(bone('l', 'lo'), bone('l', 'hand'), V(-.62, -.6, .2));
    aim(bone('r', 'up'), bone('r', 'lo'), V(-.2, -.6, .8)); aim(bone('r', 'up'), bone('r', 'lo'), V(-.4, -.72, .55));
    aim(bone('r', 'lo'), bone('r', 'hand'), V(.02, .95, .3)); aim(bone('r', 'hand'), bone('r', 'mid'), V(-.06, 1, .1));
    aim(neck, head, V(-.05, .98, .12));
  },
  closeHips: ({ aim, turn, bone, hips, neck, head, V }) => {
    turn(hips, V(0, 0, 1), .07);
    aim(bone('l', 'leg'), bone('l', 'shin'), V(.12, -1, .05)); aim(bone('r', 'leg'), bone('r', 'shin'), V(-.05, -1, 0));
    aim(bone('l', 'up'), bone('l', 'lo'), V(.5, -.82, -.2)); aim(bone('l', 'lo'), bone('l', 'hand'), V(-.62, -.6, .2));
    aim(bone('r', 'up'), bone('r', 'lo'), V(-.5, -.82, -.2)); aim(bone('r', 'lo'), bone('r', 'hand'), V(.62, -.6, .2));
    aim(neck, head, V(.08, .97, .1));
  },
  closeFold: ({ aim, bone, neck, head, V }) => {
    aim(bone('l', 'leg'), bone('l', 'shin'), V(.06, -1, 0)); aim(bone('r', 'leg'), bone('r', 'shin'), V(-.06, -1, .02));
    aim(bone('l', 'up'), bone('l', 'lo'), V(.3, -.88, .32)); aim(bone('l', 'lo'), bone('l', 'hand'), V(-.95, .1, .26));
    aim(bone('r', 'up'), bone('r', 'lo'), V(-.3, -.86, .38)); aim(bone('r', 'lo'), bone('r', 'hand'), V(.95, .18, .3));
    aim(neck, head, V(-.06, .98, .08));
  },
  closeHair: ({ aim, turn, bone, B, hips, neck, head, V }) => {
    turn(hips, V(0, 1, 0), .22); turn(B('spine'), V(0, 1, 0), -.16);
    aim(bone('l', 'leg'), bone('l', 'shin'), V(.1, -1, .12)); aim(bone('r', 'leg'), bone('r', 'shin'), V(-.04, -1, -.02));
    aim(bone('l', 'up'), bone('l', 'lo'), V(.5, -.82, -.2)); aim(bone('l', 'lo'), bone('l', 'hand'), V(-.62, -.6, .2));
    aim(bone('r', 'up'), bone('r', 'lo'), V(-.2, -.4, .9)); aim(bone('r', 'up'), bone('r', 'lo'), V(-.55, .8, .15));
    aim(bone('r', 'lo'), bone('r', 'hand'), V(.6, .35, -.7));
    aim(neck, head, V(-.1, .97, .14));
  },
  /* side on to him, her chest and head turned back over her shoulder */
  closeShoulder: ({ aim, turn, bone, B, V }) => {
    turn(B('spine'), V(0, 1, 0), -.15); turn(B('spine2'), V(0, 1, 0), -.1);
    aim(bone('l', 'leg'), bone('l', 'shin'), V(.04, -1, .05)); aim(bone('r', 'leg'), bone('r', 'shin'), V(-.1, -1, -.04));
    aim(bone('l', 'up'), bone('l', 'lo'), V(.18, -1, -.04)); aim(bone('l', 'lo'), bone('l', 'hand'), V(.05, -1, .18));
    aim(bone('r', 'up'), bone('r', 'lo'), V(-.5, -.82, -.2)); aim(bone('r', 'lo'), bone('r', 'hand'), V(.62, -.6, .2));
  },
};
/* poses her by bone names (Mixamo or VRoid) and turns her head by f.look. Returns where she holds a phone, if she does */
function poseFigure(root, f) {
  const B = {}; root.traverse(o => { if (o.isBone) B[o.name.toLowerCase().replace(/mixamorig\d*:?|j_bip_|[\s._:-]/g, '')] = o; });
  const find = (...k) => k.map(n => B[n]).find(Boolean) || null;
  const bone = (s, part) => { const L = s === 'l' ? 'left' : 'right'; return { up: find(s + 'upperarm', L + 'arm', 'upperarm' + s, L + 'upperarm'), lo: find(s + 'lowerarm', L + 'forearm', 'forearm' + s, 'lowerarm' + s, L + 'lowerarm'), hand: find(s + 'hand', L + 'hand', 'hand' + s), leg: find(s + 'upperleg', L + 'upleg', 'thigh' + s, 'upperleg' + s, L + 'upperleg'), shin: find(s + 'lowerleg', L + 'leg', 'shin' + s, 'lowerleg' + s, L + 'lowerleg'), foot: find(L + 'foot', s + 'foot'), toe: find(L + 'toebase', s + 'toebase', s + 'toes'), mid: find(L + 'handmiddle1', s + 'middle1'), index: find(L + 'handindex1', s + 'index1'), pinky: find(L + 'handpinky1', s + 'little1') }[part]; };
  const hips = find('hips', 'chips'), neck = find('neck', 'cneck'), head = find('head', 'chead'), top = find('headtopend');
  const a = new THREE.Vector3(), b = new THREE.Vector3(), q = new THREE.Quaternion(), pq = new THREE.Quaternion(), V = (x, y, z) => new THREE.Vector3(x, y, z);
  const turn = (bn, axis, ang) => { if (!bn) return; root.updateMatrixWorld(true); bn.parent.getWorldQuaternion(pq); q.setFromAxisAngle(axis.normalize(), ang); bn.quaternion.premultiply(pq.clone().invert().multiply(q).multiply(pq)); };
  const aim = (bn, child, dir) => { if (!bn || !child) return; root.updateMatrixWorld(true); bn.getWorldPosition(a); child.getWorldPosition(b); q.setFromUnitVectors(b.sub(a).normalize(), dir.clone().normalize()); bn.parent.getWorldQuaternion(pq); bn.quaternion.premultiply(pq.clone().invert().multiply(q).multiply(pq)); };
  const twist = (bn, child, ang) => { if (!bn || !child) return; root.updateMatrixWorld(true); bn.getWorldPosition(a); child.getWorldPosition(b); turn(bn, b.clone().sub(a), ang); };
  /* both arms, mirrored: x flips for the right */
  const arms = (up, lo, hand) => { for (const [s, k] of [['l', 1], ['r', -1]]) { for (const d of up) aim(bone(s, 'up'), bone(s, 'lo'), V(d[0] * k, d[1], d[2])); aim(bone(s, 'lo'), bone(s, 'hand'), V(lo[0] * k, lo[1], lo[2])); aim(bone(s, 'hand'), bone(s, 'mid'), V(hand[0] * k, hand[1], hand[2])); } };
  (FIG_POSES[f.pose] || FIG_POSES.stand)({ aim, turn, twist, arms, bone, hips, neck, head, top, V, B: n => find(n) });
  if (head) { root.updateMatrixWorld(true); head.parent.getWorldQuaternion(pq); q.setFromAxisAngle(V(0, 1, 0), f.look || 0); head.quaternion.premultiply(pq.clone().invert().multiply(q).multiply(pq)); }
  root.updateMatrixWorld(true);
  const s = f.phone === 'l' ? 'l' : 'r', two = f.phone === 'both' || f.phone === 'tablet', pts = two ? [bone('l', 'mid') || bone('l', 'hand'), bone('r', 'mid') || bone('r', 'hand')] : [bone(s, 'index'), bone(s, 'pinky')];
  const grip = f.phone && pts[0] && pts[1] && head ? { a: pts[0].getWorldPosition(V(0, 0, 0)), b: pts[1].getWorldPosition(V(0, 0, 0)), head: head.getWorldPosition(V(0, 0, 0)), hold: bone(s, 'hand') } : null;
  /* close up she also shifts her weight (hips, legs, low back) and her arms swing clear of her body between poses */
  const cl = f.close ? { hips, spine: find('spine', 'cspine'), legL: bone('l', 'leg'), legR: bone('r', 'leg'), armL: bone('l', 'up'), armR: bone('r', 'up'), foreL: bone('l', 'lo'), foreR: bone('r', 'lo'), handL: bone('l', 'hand'), handR: bone('r', 'hand') } : {};
  return { grip, idle: { chest: find('spine2', 'upperchest', 'cupperchest'), neck, head, hand: grip && !two ? grip.hold : null, wave: f.wave ? bone('r', 'lo') : null, ...cl } };
}

function addFigure(f) {
  const tok = ++figTok;
  figP = import('./vendor/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => new GLTFLoader().loadAsync(f.url)).then(g => {
    if (tok !== figTok) return;
    const root = g.scene, bones = [], meshes = [], v = new THREE.Vector3(), box = new THREE.Box3(), Y = new THREE.Vector3(0, 1, 0);
    root.traverse(o => { if (o.isBone) bones.push(o); if (o.isMesh) meshes.push(o); });
    const rest = bones.map(b => b.quaternion.clone());
    /* her skin's extent, every third vertex is plenty: for her size, and for where each pose's lowest point and middle are */
    const span = lay => { box.makeEmpty(); root.updateMatrixWorld(true); for (const o of meshes) { const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i += 3) { v.fromBufferAttribute(pos, i); if (o.isSkinnedMesh) o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld); if (lay) v.applyQuaternion(lay); box.expandByPoint(v); } } return box; };
    /* her size comes from the rest pose: sitting or lying she is the same woman */
    const s = f.h / (span(null).max.y - box.min.y);
    let id = 150; const mat = m => { const map = m && m.map; if (map) { map.colorSpace = THREE.NoColorSpace; map.needsUpdate = true; } return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: FIG_VS, fragmentShader: FIG_FS, side: THREE.DoubleSide, uniforms: { map: { value: map || null }, uBase: { value: (map ? new THREE.Color(1, 1, 1) : (m && m.color ? m.color.clone() : new THREE.Color(.5, .5, .5))) }, uHasMap: { value: map ? 1 : 0 }, uHair: { value: /hair/i.test((m && m.name) || '') ? 1 : 0 }, uId: { value: (id = id + 7 > 240 ? 150 : id + 7) }, uEm: { value: m && m.em ? 1 : 0 }, uCut: FIG_CUT, uPh: FIG_PH, uDay: FIG_DAY } }); };
    for (const o of meshes) { const ms = [].concat(o.material).map(mat); o.material = ms.length > 1 ? ms : ms[0]; o.frustumCulled = false; }
    /* what she holds, her phone or a tablet: a dark slab, its lit face turned to her. It rides in the hand that holds it */
    const slab = (w, h) => { const g = new THREE.Group(); g.matrixAutoUpdate = false; g.visible = false; g.add(new THREE.Mesh(new THREE.BoxGeometry(w / s, h / s, .009 / s), mat({ color: new THREE.Color(.05, .05, .07) })), new THREE.Mesh(new THREE.PlaneGeometry((w - .008) / s, (h - .01) / s).translate(0, 0, .0047 / s), mat({ color: new THREE.Color(.55, .8, 1), em: 1 }))); g.children.forEach(m => { m.frustumCulled = false; }); return g; };
    const props = { phone: slab(.074, .152), tablet: slab(.25, .17) };
    /* each key pose: every bone's turn, and where her body goes so the pose's lowest point sits at `at` */
    const keys = (f.poses || [f]).map(p => {
      bones.forEach((b, i) => b.quaternion.copy(rest[i]));
      const { grip, idle } = poseFigure(root, p), qq = new THREE.Quaternion();
      const lay = p.lay ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(p.lay[0], p.lay[1], p.lay[2]).normalize(), p.lay[3]) : null;
      const bx = span(lay).clone(), ry = new THREE.Quaternion().setFromAxisAngle(Y, p.ry || 0);
      const c = new THREE.Vector3((bx.min.x + bx.max.x) / 2, bx.min.y, (bx.min.z + bx.max.z) / 2);
      const P = new THREE.Vector3(room.box.x + p.at[0], room.box.y + p.at[1], room.box.z + p.at[2]).sub(c.applyQuaternion(ry).multiplyScalar(s));
      const R = lay ? ry.clone().multiply(lay) : ry.clone();
      /* her box in the room, for tests */
      const out = new THREE.Box3(); for (let k = 0; k < 8; k++) out.expandByPoint(v.set(k & 1 ? bx.max.x : bx.min.x, k & 2 ? bx.max.y : bx.min.y, k & 4 ? bx.max.z : bx.min.z).applyQuaternion(ry).multiplyScalar(s).add(P));
      /* the idle turns happen in each bone's own frame: her chest's and head's axes, as this pose leaves them */
      const ax = {}; for (const [k, bn] of Object.entries(idle)) if (bn) { bn.getWorldQuaternion(qq).invert(); ax[k] = { bone: bones.indexOf(bn), x: new THREE.Vector3(1, 0, 0).applyQuaternion(qq), y: new THREE.Vector3(0, 1, 0).applyQuaternion(qq), z: new THREE.Vector3(0, 0, 1).applyQuaternion(qq) }; }
      /* close up: where each upper arm points (her frame), for how far it swings between poses */
      const dir = (x, y) => idle[y].getWorldPosition(new THREE.Vector3()).sub(idle[x].getWorldPosition(v)).normalize();
      const arm = idle.armL && idle.foreL && idle.handL && idle.armR && idle.foreR && idle.handR ? [['armL', 'foreL', 'handL'], ['armR', 'foreR', 'handR']].map(([u, l, h]) => { const d = dir(u, l), e = dir(l, h); return { d, e, bend: d.angleTo(e) }; }) : null;
      let ph = null;
      /* held in one hand, the phone lies on the palm side of the knuckles, toward her face, not inside the hand */
      if (grip) { const X = grip.a.clone().sub(grip.b).normalize(), m = grip.a.clone().add(grip.b).multiplyScalar(.5), n = grip.head.clone().sub(m); n.addScaledVector(X, -n.dot(X)).normalize(); if (p.phone === 'l' || p.phone === 'r') m.addScaledVector(n, .022 / s); ph = { prop: p.phone === 'tablet' ? 'tablet' : 'phone', bone: grip.hold, m: grip.hold.matrixWorld.clone().invert().multiply(new THREE.Matrix4().makeBasis(X, new THREE.Vector3().crossVectors(n, X), n).setPosition(m)) }; }
      return { q: bones.map(b => b.quaternion.clone()), P, R, ph, ax, arm, pose: p.pose, close: !!p.close, y0: out.min.y, y1: out.max.y, box: [out.min, out.max].map(e => [e.x - room.box.x, e.y - room.box.y, e.z - room.box.z].map(x => Math.round(x * 1e3) / 1e3)) };
    });
    /* both her programs now (skinned, and the plain one for what she holds), not in the middle of a blink */
    root.add(props.phone, props.tablet); renderer.compile(root, CAM, SC.room); root.remove(props.phone, props.tablet);
    root.scale.setScalar(s); root.visible = room.clutter.visible; SC.room.add(root);
    /* the spot's poses come first, then the close-up ones (f.nS: how many are the spot's) */
    const nS = f.nS || keys.length;
    /* close up, between poses: her body moves first, her arms a beat later, her hands last */
    const lag = new Float32Array(bones.map(b => { const n = b.name.toLowerCase(); return /hand|thumb|index|middle|ring|pinky|little/.test(n) ? .24 : /forearm|lowerarm/.test(n) ? .17 : /arm/.test(n) ? .1 : /shoulder/.test(n) ? .05 : 0; }));
    FIG = { root, bones, keys, props, s, nS, lag, lo: 0, hi: nS, i: Math.floor(Date.now() / 6e4) % nS, go: null, n: 0, next: S.t + 30, t1: S.t, ph: null, q: new THREE.Quaternion(), v: new THREE.Vector3() };
    if (S.close) figClose(true);
    figTick(S.t);
  }).catch(e => APP.log(e));
  return figP;
}
/* every frame she's drawn: her pose (or the blend between two), then breath, a wandering look, a thumb on the phone */
const ease = u => u * u * (3 - 2 * u);
/* into key pose j: a blend if it's a shift where she is, a blink if she'd have to pass through the furniture */
/* close up she turns where she stands, so a big turn there is a blend too */
function figGo(j, t) {
  const F = FIG, a = F.keys[F.i], b = F.keys[j], st = a.close && b.close && !!a.arm && !!b.arm;
  const far = a.P.distanceTo(b.P) > .45 || (a.R.angleTo(b.R) > .7 && !st);
  /* close up: staggered, and each arm swings out in front of her by how far it has to go */
  F.go = { j, t0: t, far, st, arc: st ? [0, 1].map(s => a.arm[s].d.angleTo(b.arm[s].d)) : null, dur: far ? .8 : st ? 2.6 : 2.2 };
}
/* close up, mid-move: each upper arm travels straight from where it was to where it's going, bowed out in front of
   her (not round through her side, over her head or through her body), and the elbow folds in on the way, the way a
   hand travels. The bone blend keeps the twist; this only sets where the arm points and how bent it is */
const UP_Y = new THREE.Vector3(0, 1, 0);
const SW = { A: new THREE.Vector3(), E: new THREE.Vector3(), H: new THREE.Vector3(), d: new THREE.Vector3(), d2: new THREE.Vector3(), f: new THREE.Vector3(), U: new THREE.Vector3(0, 1, 0), q: new THREE.Quaternion(), pq: new THREE.Quaternion() };
function figSwing(k, b, u) {
  const F = FIG, ax = k.ax, { A, E, H, d, d2, f, q, pq } = SW;
  const rot = (bn, qw) => { bn.parent.getWorldQuaternion(pq); bn.quaternion.premultiply(pq.clone().invert().multiply(qw).multiply(pq)); bn.updateMatrixWorld(true); };
  const lw = bn => ease(Math.min(1, Math.max(0, (u - F.lag[bn]) / .76)));
  F.root.updateMatrixWorld(true); f.set(0, 0, 1);
  ['L', 'R'].forEach((s, i) => {
    const xu = ax['arm' + s], xl = ax['fore' + s], xh = ax['hand' + s]; if (!xu || !xl || !xh) return;
    const up = F.bones[xu.bone], lo = F.bones[xl.bone], hd = F.bones[xh.bone], ka = k.arm[i], kb = b.arm[i];
    /* where a bone points, part way from one pose to the next, bowed out in front of her by how far it has to go */
    const via = (pa, pb, w, bow) => d2.copy(pa).multiplyScalar(1 - w).addScaledVector(pb, w).addScaledVector(bow, Math.min(.8, pa.angleTo(pb) * .4) * Math.sin(Math.PI * w)).normalize().applyQuaternion(F.root.quaternion);
    if (F.go.arc[i] > .1) { up.getWorldPosition(A); lo.getWorldPosition(E); d.subVectors(E, A).normalize(); via(ka.d, kb.d, lw(xu.bone), f); rot(up, q.setFromUnitVectors(d, d2)); }
    /* the forearm too: steered by where it points, not just how bent, so the hand comes down in front of her the short
       way rather than flipping over at the elbow. To or from a raised arm (a hand in her hair) the forearm passes
       straight up halfway, so the hand rises and falls by the side of her head instead of sweeping across her face */
    if (ka.e.angleTo(kb.e) > .1) {
      lo.getWorldPosition(E); hd.getWorldPosition(H); d.subVectors(H, E).normalize(); const wl = lw(xl.bone);
      if (ka.d.y > 0 || kb.d.y > 0) { const W = SW.U.set(i ? -.15 : .15, 1, .05).normalize(); if (wl < .5) via(ka.e, W, wl * 2, f); else via(W, kb.e, wl * 2 - 1, f); }
      else via(ka.e, kb.e, wl, f);
      rot(lo, q.setFromUnitVectors(d, d2));
    }
  });
}
/* into the close-up poses (and back to the one she left, as the view pulls back). snap: no blend, for leaving the room */
function figClose(on, snap) {
  const F = FIG; if (!F || F.keys.length <= F.nS || on === (F.lo === F.nS)) return;
  if (on) { F.prev = F.go && !F.keys[F.go.j].close ? F.go.j : F.i; F.lo = F.nS; F.hi = F.keys.length; }
  else { F.lo = 0; F.hi = F.nS; }
  const j = on ? F.nS : F.prev != null && F.prev < F.nS ? F.prev : 0;
  if (snap) { F.i = j; F.go = null; FIG_CUT.value = 1e4; F.t1 = S.t; } else figGo(j, S.t);
  if (F.next !== Infinity) F.next = S.t + (on ? 9 : 40);
}
function figTick(t) {
  const F = FIG; if (!F || !F.root.visible || S.mode === 'city') return;
  const K = F.keys, nR = F.hi - F.lo;
  if (nR > 1 && !F.go && t > F.next) figGo(F.lo + ((F.i - F.lo + 1) % nR + nR) % nR, t);
  let w = 0, u = 0, k = K[F.i];
  if (F.go) {
    u = Math.min(1, (t - F.go.t0) / F.go.dur);
    if (F.go.far) { const c = K[u < .5 ? F.i : F.go.j]; FIG_CUT.value = REDUCED ? 1e4 : c.y0 - .05 + (c.y1 - c.y0 + .1) * ease(Math.abs(u * 2 - 1)); if (u >= .5) k = K[F.go.j]; }
    else w = ease(F.go.st ? Math.min(1, u / .76) : u);
    if (u >= 1) { F.i = F.go.j; k = K[F.i]; F.go = null; FIG_CUT.value = 1e4; w = 0; F.n++; F.t1 = t; if (F.next !== Infinity) F.next = t + (k.close ? 7 + (F.n * 3.7) % 4 : 40 + (F.n * 13.7) % 30); }
  }
  const b = F.go && !F.go.far ? K[F.go.j] : null, G = b && F.go.st ? F.lag : null;
  for (let i = 0; i < F.bones.length; i++) { const q = F.bones[i].quaternion.copy(k.q[i]); if (b) q.slerp(b.q[i], G ? ease(Math.min(1, Math.max(0, (u - G[i]) / .76))) : w); }
  if (b) { F.root.position.lerpVectors(k.P, b.P, w); F.root.quaternion.slerpQuaternions(k.R, b.R, w); } else { F.root.position.copy(k.P); F.root.quaternion.copy(k.R); }
  /* close up he can turn her round to see every side: a turn about the middle of where she stands */
  if (S.spin) { const c = room.def.figure.close[0].at, px = room.box.x + c[0], pz = room.box.z + c[2], q = F.q.setFromAxisAngle(UP_Y, S.spin); F.v.set(F.root.position.x - px, 0, F.root.position.z - pz).applyQuaternion(q); F.root.position.x = px + F.v.x; F.root.position.z = pz + F.v.z; F.root.quaternion.premultiply(q); }
  if (G) figSwing(k, b, u);
  const on = b && w > .5 ? b : k;
  if (!REDUCED) {
    const turn = (x, axis, ang) => { if (x) F.bones[x.bone].quaternion.multiply(F.q.setFromAxisAngle(x[axis], ang)); };
    /* close up she breathes deeper and her weight rolls slowly from hip to hip (her legs held, so her feet stay put) */
    const br = .5 + .5 * Math.sin(t * 1.5), cl = on.close ? 1.8 : 1;
    turn(on.ax.chest, 'x', -br * .016 * cl); turn(on.ax.neck, 'x', br * .01 * cl);
    if (on.close) {
      const sw = Math.sin(t * .42) * .04 + Math.sin(t * .17 + 2) * .015;
      turn(on.ax.hips, 'z', sw); turn(on.ax.legL, 'z', -sw); turn(on.ax.legR, 'z', -sw);
      turn(on.ax.spine, 'z', -sw * .6); turn(on.ax.spine, 'y', Math.sin(t * .29 + 1) * .03);
      turn(on.ax.head, 'z', Math.sin(t * .21 + .7) * .04);
    }
    /* close up her eyes stay on him: the head wanders less */
    const calm = on.close ? .5 : on.ph ? .35 : 1;
    turn(on.ax.head, 'y', (Math.sin(t * .23) * .16 + Math.sin(t * .61 + 1.3) * .07) * calm); turn(on.ax.head, 'x', Math.sin(t * .17 + .5) * .05 * calm);
    turn(on.ax.hand, 'x', Math.pow(Math.max(0, Math.sin(t * 2.6)), 8) * .08);
    /* the wave: a few seconds once she's turned to him, then the hand rests up */
    if (on.ax.wave && !F.go) { const u = t - F.t1; turn(on.ax.wave, 'z', Math.sin(u * 8) * .3 * Math.max(0, 1 - u / 3.2)); }
  }
  if (F.ph !== on.ph) { if (F.ph) F.props[F.ph.prop].visible = false; F.ph = on.ph; if (on.ph) { const g = F.props[on.ph.prop]; on.ph.bone.add(g); g.matrix.copy(on.ph.m); g.visible = true; } }
  F.root.updateMatrixWorld(true);
  if (F.ph) { F.props[F.ph.prop].localToWorld(F.v.set(0, 0, .03 / F.s)); FIG_PH.value.set(F.v.x, F.v.y, F.v.z, 1); } else FIG_PH.value.w = 0;
}

/* One room in memory at a time. A swap changes geometry and uniform values only, so no shader ever recompiles.
   room.id is set last: if a build throws, the next tap simply tries again. */
const EMPTY_GEOM = new THREE.BufferGeometry();
/* keep: a repaint of the room he's watching (a new day) leaves her where she is and as she is. Only a way in moves her */
function loadRoom(id, keep) {
  if (room.id === id && (!room.day || room.day === new Date().toDateString()) && (!room.spot || room.spot === figSpot())) return;
  const def = ROOM_DEF[id], pin = keep && room.id === id ? room.spot : null, same = !!pin && !!(FIG || figP); PIECES = 0;
  for (const g of [room.geom, room.clutterGeom, room.doorGeom, room.glassGeom, room.doorGlassGeom, room.fxGeom, room.backGeom]) if (g) g.dispose();
  if (room.atlas) room.atlas.dispose();
  const d = def.build(pin || undefined); if (!same) dropFigure();
  Object.assign(room, { clutterGeom: null, doorGeom: null, glassGeom: null, doorGlassGeom: null, backGeom: null, gobo: null, atlas: null, day: null, spot: null, mirDone: false, paint: null }, d, { def, box: def.box });
  const put = (m, g) => { m.visible = !!g; m.geometry = g || EMPTY_GEOM; };
  put(room.mesh, room.geom); put(room.clutter, room.clutterGeom); put(room.door, room.doorGeom); put(room.glass, room.glassGeom); put(room.doorGlass, room.doorGlassGeom); put(room.fx, room.fxGeom); room.fx.renderOrder = def.fxOverGlass ? 6 : 0;
  put(room.mirMesh, def.mirror && room.geom); put(room.mirBack, def.mirror && room.backGeom);
  const gm = buildGlowMesh(room.glows); room.glowMesh.geometry.dispose(); room.glowMesh.geometry = gm.geometry; gm.material.dispose();
  room.lampK = 1; roomLights();
  room.u.uAmbHi.value.setRGB(...def.amb[0]); room.u.uAmbLo.value.setRGB(...def.amb[1]); room.u.uAmbSide.value.setRGB(...def.amb[2]); room.u.uRim.value.setRGB(...def.amb[3]);
  if (room.gobo) { Object.assign(room.u.uGobo.value, room.gobo.rect); room.u.uGoboX.value = room.gobo.x; room.u.uGoboD.value.copy(room.gobo.dir); room.u.uGoboC.value.setRGB(...room.gobo.color); } else room.u.uGoboC.value.setRGB(0, 0, 0);
  room.u.uSigns.value = room.atlas || TEX.signs;
  if (def.hole) { const { zs, ys } = def.window, x = def.box.x + def.box.w / 2 + .01, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([x, ys[0], zs[0], x, ys[0], zs[1], x, ys[1], zs[1], x, ys[0], zs[0], x, ys[1], zs[1], x, ys[1], zs[0]]), 3)); room.hole.geometry.dispose(); room.hole.geometry = g; }
  if (def.mirror) room.mirU.uClipZ.value = def.mirror[2];
  skyRoom();
  room.id = id; hudEl.dataset.room = id; room.setDoor(0);
  setText('#shName', def.sheet[0]); setText('#shPage', def.sheet[1]); $('#sheet').setAttribute('aria-label', def.sheet[0]);
  if (def.figure && !same) addFigure(room.spot ? { ...def.figure, poses: def.figure.spots[room.spot].concat((def.figure.close || []).map(p => ({ ...p, close: true }))), nS: def.figure.spots[room.spot].length } : def.figure);
  if (ready) { bakeRoom(); buildTags(); refreshRoom(); }
}

function resize() {
  const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
  /* laptops with a plain display render above their pixels, phones are capped at 2 */
  const pr = Math.min(isPhone ? Math.min(DPR, 2) : Math.max(Math.min(DPR, 2), 1.5), PM.dpr) * Q.scale;
  const W = Math.round(w * pr), H = Math.round(h * pr);
  renderer.setSize(W, H, false); canvas.style.width = '100%'; canvas.style.height = '100%';
  CAM.aspect = w / h; applyFov(); if (CAM.aspect < .8) moonSkyDir.set(-.2, .44, -.875).normalize(); else moonSkyDir.set(.15, .31, -.94).normalize();
  for (const k of Object.keys(RT)) { RT[k].dispose(); if (RT[k].depthTexture) RT[k].depthTexture.dispose(); }
  RT.main = makeRT(W, H, { depth: true, depthTex: true }); RT.ldr = makeRT(W, H);
  /* the street behind the glass, full size but only inside the window's rectangle */
  RT.bg = makeRT(W, H, { depth: true }); RT.bg.scissorTest = true;
  const rd = pr < 1.4 ? 1.6 : 2.2; RT.refl = makeRT(Math.ceil(W / rd), Math.ceil(H / rd), { depth: true });
  const bw = Math.ceil(W / 4), bh = Math.ceil(H / 4);
  RT.mir = makeRT(Math.ceil(W / 2.4), Math.ceil(H / 2.4), { depth: true }); room.u.uMirror.value = RT.mir.texture;
  RT.b0 = makeRT(bw, bh); RT.b1 = makeRT(bw, bh); RT.b2 = makeRT(Math.ceil(bw / 3), Math.ceil(bh / 3)); RT.b3 = makeRT(Math.ceil(bw / 3), Math.ceil(bh / 3));
  city.u.uRes.value.set(W, H); room.u.uRes.value.set(W, H); room.glassU.uRes.value.set(W, H);
  MAT.post.m.uniforms.px.value.set(1 / W, 1 / H); MAT.aa.m.uniforms.px.value.set(1 / W, 1 / H);
  MAT.post.m.uniforms.uInkW.value = Math.max(.85, pr * .62);
  MAT.bright.m.uniforms.px.value.set(1 / W, 1 / H);
  S.W = W; S.H = H; S.pr = pr;
  S.needsPlace = true;
}

/* ---------- state ---------- */
const S = { spin: 0, spinGoal: 0, mode: 'city', t: 0, az: 0, azGoal: 0, el: 0, elGoal: 0, yaw: 0, yawGoal: 0, pitch: 0, fly: null, last: 0, frames: 0, acc: 0, fps: 0, scanT: -9, glitchT: -9, needsPlace: true, sheet: false, drag: null, close: false, closeK: 0 };
/* low over the harbour, a third of the way up the tower, one near tower cropping the frame */
const POSE = () => CAM.aspect < .8 ? { p: [-8, 22, 408], l: [-8, 112, -200], fov: 84 } : CAM.aspect < 1.3 ? { p: [66, 50, 505], l: [-10, 220, -180], fov: 66 } : { p: [66, 52, 505], l: [-10, 196, -160], fov: 58 };
/* how far in on her the view is, eased (0 at rest) */
const closeE = () => { const u = S.closeK || 0; return u * u * (3 - 2 * u); };
function applyFov() { const a = CAM.aspect; const cf = POSE().fov; const rf = (a < .8 ? 74 : a < 1.3 ? 66 : 56) * (1 - .22 * closeE()); const k = S.mode === 'city' ? 0 : S.mode === 'room' ? 1 : (S.fly ? S.flyK : 0); const mid = S.mode === 'fly' && a < .8 ? S.flyMid || 0 : 0; CAM.fov = lerp(lerp(cf, rf, k), lerp(58, 49, S.flyIn || 0), mid); CAM.updateProjectionMatrix(); }
const local = (x, y, z) => [room.box.x + x, room.box.y + y, room.box.z + z];

function cityPose(out = {}) {
  const P = POSE(); const dx = P.p[0] - P.l[0], dz = P.p[2] - P.l[2]; const a = S.az + (REDUCED || RIG ? 0 : Math.sin(S.t * .07) * .03); const r = Math.hypot(dx, dz);
  const b = Math.atan2(dx, dz) + a;
  const yy = P.p[1] + S.el * 120 + (REDUCED || RIG ? 0 : Math.sin(S.t * .11) * 5);
  out.p = [P.l[0] + Math.sin(b) * r, yy, P.l[2] + Math.cos(b) * r]; out.l = [P.l[0], P.l[1] + Math.sin(S.t * .05) * 2, P.l[2]]; return out;
}
const ROOM_REST = () => room.def.rest(CAM.aspect);

/* Everything that differs between rooms. A room looks toward +X with its window on that wall: the gobo, the head shift and the window rectangle all rely on it. */
const ROOM_DEF = {
  shop: {
    box: SHOP, name: 'SHOP', build: buildRoom, panel: '#roomBox', sheet: ['Work', 'PAGE.01/03'], shadow: [134, 22], doorAt: [SHOP.x + SHOP.w / 2, SHOP.z + 1.6],
    amb: [[.3, .25, .34], [.2, .11, .2], [.05, .05, .09], [.3, .72, .85]],
    mirror: [SHOP.x + 3.55, 1.1, SHOP.z + SHOP.d / 2 - .26],
    window: { x: SHOP.x + SHOP.w / 2 + .05, zs: [SHOP.z - SHOP.d / 2, SHOP.z + SHOP.d / 2], ys: [0, SHOP.h] },
    rest: a => a < .8 ? { p: local(-4.38, 1.66, -.52), l: local(2, .92, -.52) } : { p: local(-4.18, 1.54, -.4), l: local(2, 1.2, -.4) },
    flight(c, r, a) {
      const up = a < .8 ? .2 : 0;
      return {
        P: [c.p, a < .8 ? [4, 92, 372] : [30, 128, 440], [12, 72, 292], [5, 14, 200], [3, 6.4, 142], [-2, 3.6, 96], [-10, 2.1, 72], [-15.2, 1.62, 63.6], [-18.6, 1.42, 63.6], local(1.6, 1.3, 2.75), local(-1.8, 1.36, 2.7), local(-3.9, 1.5, 1.9), r.p],
        L: [c.l, [4, 80, 150], [0, 16, 150], [2, a < .8 ? 15 : 8, 90], [0, a < .8 ? 12.5 : 5, 80], [-12, a < .8 ? 3.4 : 2.4, 66], [-17.4, 1.9, 63.6], [-23, 1.5, 63.2], local(-2.85, 1.22, .95), local(-2.85, 1.2, .2), local(-2.85, 1.2 + up * .7, -.8), local(-2.7, 1.2 + up * .5, -.9), r.l],
        /* weights: how long each hop lasts */
        W: [1.15, 1, .95, .6, .55, .62, .62, .42, .46, .44, .4, .5],
      };
    },
  },
  apartment: {
    box: APT, name: 'APARTMENT', build: buildApartment, panel: '#aptBox', sheet: ['Plan', 'PAGE.01/04'], shadow: [134, 10], refresh: refreshApt,
    /* inside a solid block: the flight sees it through a window-shaped hole in the city's depth */
    hole: true,
    amb: [[.12, .1, .22], [.07, .05, .15], [.03, .03, .08], [1.5, .55, 1.45]],
    window: { x: APT.x + APT.w / 2 + .05, zs: [APT.z - APT.d / 2 + .01, APT.z + APT.d / 2 - .01], ys: [APT.y + .05, APT.y + APT.h - .12] },
    /* once he is inside, the glass shows the city from up here, looking at downtown, carried rigidly from where he rests. The swap is never on screen: the camera has its back to the glass when it crosses */
    view: { eye: [10, 210, 300], theta: 1.62, far: 2500, from: [-3.2, 1.62, 0] },
    /* the room's own light lies on the glass as well */
    fxOverGlass: true,
    /* someone who lives here, in no hurry: by the window in the day, at the glass in the evening, in bed with her phone late.
       A model file, private like Dex's. Each spot lists her key poses: at is the middle of her posed footprint at its
       lowest point, ry her heading, lay turns her whole body after the pose (onto her back), phone 'both' | 'l' | 'r' | 'tablet'.
       turn: on a phone the resting view leans this far toward her spot (late: the bed) */
    figure: { url: 'models/her.glb?v=1', h: 1.7, turn: { late: .18 }, spots: {
      day: [{ pose: 'dayStretch', at: [3.82, .05, .98], ry: -1.9, look: 0 },
        { pose: 'dayRead', at: [4.087, .05, .85], ry: -2.36, look: 0, phone: 'tablet' },
        { pose: 'dayLean', at: [4.27, .17, .291], ry: -.5, look: -.25, phone: 'r' }],
      eve: [{ pose: 'stand', at: [3.7, .05, .55], ry: -2.3, look: .45 },
        { pose: 'glassLook', at: [4.094, .05, .565], ry: .96, look: .4 },
        { pose: 'stepSit', at: [4.274, .16, .65], ry: .03, look: 0, phone: 'both' }],
      late: [{ pose: 'lie', at: [3.8, .535, 3.0], ry: Math.PI, look: 0, phone: 'both', lay: [1, 0, 0, -Math.PI / 2] },
        { pose: 'sideLie', at: [3.75, .556, 3.0], ry: -Math.PI / 2, look: 0, phone: 'r', lay: [0, 0, 1, -Math.PI / 2] },
        { pose: 'headboardSit', at: [3.75, .559, 3.208], ry: Math.PI, look: 0, phone: 'both' }] },
      /* tap her: the view moves in on her at the glass (whatever the hour, she comes to it) and she turns to him. Each
         pose in turn, every 7 to 11 s; the wave first. view: where the camera stands, a longer lens (fov x .78) */
      close: [{ pose: 'closeWave', at: [3.7, .05, .55], ry: -1.76, look: 0, wave: true },
        { pose: 'closeHips', at: [3.7, .05, .55], ry: -1.76, look: .05 },
        { pose: 'closeHair', at: [3.7, .05, .55], ry: -1.76, look: -.05 },
        { pose: 'closeFold', at: [3.7, .05, .55], ry: -1.76, look: 0 },
        { pose: 'closeShoulder', at: [3.7, .05, .55], ry: -.8, look: -.6 }],
      view: a => a < .8 ? { p: local(2.57, 1.46, .33), l: local(3.7, 1.38, .55) } : { p: local(2.42, 1.5, .31), l: local(3.7, 1.42, .55) } },
    rest: a => a < .8 ? { p: local(-3.2, 1.62, 0), l: local(3, 1.1, 0) } : { p: local(-3.25, 1.6, -.1), l: local(3, 1.25, -.1) },
    flight(c, r, a) {
      const y = APT.y, z = APT.z;
      return {
        /* down past the front of the block, over the pink roof, into the gap between the two, in through the window clear of her, then round by the lit kitchen to face it */
        P: [c.p, a < .8 ? [-14, 74, 372] : [14, 118, 436], [-22, 92, 330], [-40, 82, 276], [-52, y + 18, z + 16], [-60, y + 7, z + 3], [-65.4, y + 2.1, z - .5], local(5.2, 1.72, -.75), local(2.4, 1.76, -.1), local(-.5, 1.76, .45), local(-2.6, 1.68, .4), r.p],
        L: [c.l, [-30, 90, 230], [-60, 62, z + 4], [-68, y + 6, z], [-69, y + 4, z], [-69, y + 2, z], [-70, y + 1.7, z - .5], local(-4.3, 1.45, -.3), local(-2.2, 1.45, -3.8), local(.4, 1.25, -3.8), local(2.8, 1.15, -2.6), r.l],
        W: [1.15, 1, .9, .7, .55, .55, .5, .4, .32, .3, .42],
      };
    },
  },
  gym: {
    box: GR, name: 'GYM', build: buildGym, panel: '#gymBox', sheet: ['Train', 'PAGE.01/04'], shadow: [134, 10], refresh: refreshGym,
    /* inside the warehouse: the flight sees it through a door-shaped hole in the city's depth */
    hole: true,
    amb: [[.3, .24, .24], [.15, .09, .14], [.06, .05, .06], [1.4, .6, .24]],
    window: { x: GR.x + GR.w / 2 + .05, zs: [GR.z - GDOOR.dz, GR.z + GDOOR.dz], ys: [GR.y + .02, GR.y + GDOOR.h] },
    /* at the back of the bay, facing the open door and the street */
    rest: a => a < .8 ? { p: local(-4.6, 1.62, 0), l: local(4, 1.3, 0) } : { p: local(-4.7, 1.6, -.1), l: local(4, 1.45, -.1) },
    flight(c, r, a) {
      const x = GR.x + GR.w / 2, z = GR.z;
      return {
        /* over the island to the gym's east side, down onto the lot, in under the door, then round by the dumbbells to face it */
        P: [c.p, a < .8 ? [40, 110, 300] : [60, 140, 380], [150, 88, 40], [x + 40, 52, z + 60], [x + 32, 14, z + 16], [x + 16, 3.4, z + 2], [x + 6, 1.9, z + .2], local(4.4, 1.72, .3), local(1.4, 1.7, .6), local(-1.8, 1.66, .7), local(-3.9, 1.64, .35), r.p],
        L: [c.l, [120, 30, -60], [x, 14, z], [x - 4, 6, z], [x - 2, 2.6, z], [x - 4, 1.8, z], local(-2, 1.6, 0), local(-6, 1.5, .3), local(-6, 1.45, -2.6), local(-3, 1.4, -4.8), local(1.5, 1.35, -3.6), r.l],
        W: [1.15, 1, .9, .7, .6, .5, .42, .4, .34, .32, .42],
      };
    },
  },
  chalet: {
    box: CR, name: 'CHALET', build: buildChalet, panel: '#chBox', sheet: ['Fuel', 'PAGE.01/04'], shadow: [134, 10], refresh: refreshChalet,
    /* inside the chalet: the flight sees it through its glass end, a hole in the city's depth */
    hole: true,
    amb: [[.34, .26, .2], [.17, .1, .08], [.06, .045, .04], [.7, .85, 1.4]],
    window: { x: CR.x + CR.w / 2 + .05, zs: [CR.z - 3, CR.z + 3], ys: [CR.y + .02, CR.y + 2.6] },
    /* on a phone the view leans a little right, so the fridge is in it with the island and the ticket */
    turn: .1,
    /* at the back by the door, facing the glass and the lift */
    rest: a => a < .8 ? { p: local(-3.4, 1.6, -.1), l: local(4, 1.3, -.1) } : { p: local(-3.3, 1.62, 0), l: local(4, 1.25, 0) },
    flight(c, r, a) {
      const { x, y, z } = CH;
      return {
        /* up over the island toward the mountain, down past the lift station, onto the deck, in through the glass, then round by the stove to face it */
        P: [c.p, a < .8 ? [60, 200, 200] : [90, 230, 260], [150, 300, -300], [x + 70, y + 40, z + 40], [x + 26, y + 9, z + 8], [x + 11, y + 2.4, z + 1.2], local(6.2, 1.75, .4), local(3.2, 1.72, .7), local(.8, 1.78, .95), local(-1.8, 1.66, .6), local(-2.9, 1.64, .2), r.p],
        L: [c.l, [150, 260, -600], [x, y + 10, z], [x + 4, y + 3, z], [x + 4, y + 1.8, z], local(-2, 1.5, 0), local(-6, 1.45, .3), local(-6, 1.45, -2.6), local(-3, 1.4, -4.8), local(1.5, 1.35, -3.6), local(3, 1.3, -1.5), r.l],
        W: [1.15, 1, .95, .7, .55, .45, .42, .4, .34, .32, .42],
      };
    },
  },
  castle: {
    box: CS, name: 'CASTLE', build: buildCastle, panel: '#scBox', sheet: ['School', 'PAGE.01/04'], shadow: [134, 10], refresh: refreshCastle,
    /* the study hall in the castle's east end: the flight sees it through its big window, a hole in the city's depth */
    hole: true,
    amb: [[.3, .25, .24], [.15, .1, .1], [.06, .05, .06], [.6, .8, 1.3]],
    window: { x: CS.x + CS.w / 2 + .05, zs: [CS.z - 1.3, CS.z + 1.3], ys: [CS.y + .75, CS.y + 3.95] },
    /* at the back by the library, facing the window and the skyline */
    rest: a => a < .8 ? { p: local(-3.4, 1.62, 0), l: local(4, 1.3, 0) } : { p: local(-3.3, 1.64, 0), l: local(4, 1.3, 0) },
    flight(c, r, a) {
      const { x, y, z } = CS, ex = x + CS.w / 2;
      return {
        /* out over the harbour, low across the water to the castle's east face, in through the big window, then round by the library to face it */
        P: [c.p, a < .8 ? [-40, 96, 380] : [-30, 116, 430], [-100, 78, 345], [ex + 42, y + 15, z + 10], [ex + 16, y + 3.6, z + 2], [ex + 4, y + 2.1, z + .2], local(4.2, 1.95, 0), local(1.4, 1.8, .6), local(-1.2, 1.72, .7), local(-2.6, 1.66, .4), r.p],
        L: [c.l, [-200, 40, 300], [x, y + 4, z], [x, y + 2.4, z], [x - 4, y + 2, z], local(-6, 1.7, .2), local(-6, 1.55, -2.6), local(-3, 1.45, -4.8), local(1.5, 1.4, -3.6), local(3, 1.32, -1.5), r.l],
        W: [1.15, 1, .95, .7, .5, .44, .42, .36, .34, .42],
      };
    },
  },
};
/* the room view turned by y: the head moves when you look, so what is near the glass shifts against the street */
function restView(y) {
  const r = ROOM_REST(), dx = r.l[0] - r.p[0], dy = r.l[1] - r.p[1], dz = r.l[2] - r.p[2], ca = Math.cos(y), sa = Math.sin(y);
  const p = [r.p[0] + (1 - ca) * .22, r.p[1], r.p[2] + sa * .34];
  return { p, l: [p[0] + dx * ca - dz * sa, p[1] + dy, p[2] + dx * sa + dz * ca] };
}
/* a flight ends on the view as it is turned (y), so leaving or arriving never jumps */
function flightKeys(y = 0) { return room.def.flight(cityPose(), restView(y), CAM.aspect); }
function makeFlight(dir, y = 0) {
  flyLabel(dir);
  const k = flightKeys(y);
  const toV = a => a.map(p => new THREE.Vector3(...p));
  const cp = new THREE.CatmullRomCurve3(toV(k.P), false, 'centripetal'), cl = new THREE.CatmullRomCurve3(toV(k.L), false, 'centripetal');
  const tot = k.W.reduce((a, b) => a + b, 0); let acc = 0; const stops = [0]; for (const w of k.W) { acc += w; stops.push(acc / tot); }
  S.fly = { dir, u: dir > 0 ? 0 : 1, dur: REDUCED ? 1.2 : dir > 0 ? 6.4 : 5, cp, cl, stops, n: k.P.length - 1, yaw: y };
}
function flightSample(f, u, outP, outL) {
  /* eased, then spent per hop */
  const e = u * u * (3 - 2 * u) * .6 + u * .4;
  let i = 0; while (i < f.n - 1 && e > f.stops[i + 1]) i++;
  const t = (i + (e - f.stops[i]) / (f.stops[i + 1] - f.stops[i])) / f.n;
  f.cp.getPoint(t, outP); f.cl.getPoint(t, outL);
  return e;
}
const _p = new THREE.Vector3(), _l = new THREE.Vector3(), _v = new THREE.Vector3();
function updateCamera(dt) {
  const smooth = 1 - Math.exp(-dt * 7);
  if (S.mode === 'cam') { CAM.position.set(...S.camP); CAM.lookAt(...S.camL); setNear(S.camN || .5, 8000); }
  else if (S.mode === 'city') {
    S.az = lerp(S.az, S.azGoal, smooth); S.el = lerp(S.el, S.elGoal, smooth);
    const c = cityPose(); CAM.position.set(...c.p); CAM.lookAt(...c.l); S.flyK = 0; setNear(3.5, 13000);
  } else if (S.mode === 'fly') {
    const f = S.fly; f.u = clamp(f.u + f.dir * dt / f.dur);
    const e = flightSample(f, f.u, _p, _l); CAM.position.copy(_p); CAM.lookAt(_l);
    S.flyK = sstep(.58, .95, e); S.flyMid = sstep(.1, .3, e) * (1 - sstep(.86, .98, e)); S.flyIn = sstep(.7, .78, e);
    const n = lerp(3.5, .06, sstep(.35, .7, e)); setNear(n, lerp(13000, 6000, S.flyK));
    /* door opens as the camera nears, closes behind it */
    const dA = room.def.doorAt; if (dA) room.setDoor(1 - sstep(4, 16, Math.hypot(CAM.position.x - dA[0], CAM.position.z - dA[1])));
    applyFov();
    onFlightProgress(e, f.dir);
    if (f.dir > 0 && f.u >= 1) enterRoom(); if (f.dir < 0 && f.u <= 0) enterCity();
  } else {
    /* first person: drag to look, eases back after three seconds */
    if (!S.drag && performance.now() - S.lastDrag > 3000 && !RIG) S.yawGoal = restYaw();
    S.yaw = lerp(S.yaw, S.yawGoal, 1 - Math.exp(-dt * 6));
    const breathe = RIG ? 0 : Math.sin(S.t * .6) * .004;
    const v = restView(S.yaw + Math.sin(S.t * .23) * (RIG ? 0 : .006));
    /* tapping her moves the view in on her, and back */
    const ck = clamp(S.closeK + (S.close ? 1 : -1) * dt / (REDUCED ? .25 : 1.15));
    if (ck !== S.closeK) { S.closeK = ck; applyFov(); }
    if (!S.close) S.spinGoal = 0;
    if (S.spin !== S.spinGoal) { S.spin += (S.spinGoal - S.spin) * (1 - Math.exp(-dt * (REDUCED ? 40 : 7))); if (Math.abs(S.spinGoal - S.spin) < 1e-4) S.spin = S.spinGoal; }
    const fv = room.def.figure && room.def.figure.view, e = closeE();
    if (fv && e > 0) { const c = fv(CAM.aspect); for (let i = 0; i < 3; i++) { v.p[i] = lerp(v.p[i], c.p[i], e); v.l[i] = lerp(v.l[i], c.l[i], e); } }
    CAM.position.set(v.p[0], v.p[1] + breathe, v.p[2]); CAM.lookAt(...v.l);
    setNear(.06, 6000); S.flyK = 1;
  }
}
function flightRes(on) { if (!isPhone) return; if (on && S.fps && S.fps < 50 && !S.resHeld && Q.scale > .8) { S.resHeld = Q.scale; Q.scale = .8; resize(); } else if (!on && S.resHeld) { Q.scale = S.resHeld; S.resHeld = 0; resize(); adaptCool = 3; } }
function setNear(n, f) { if (CAM.near !== n || CAM.far !== f) { CAM.near = n; CAM.far = f; CAM.updateProjectionMatrix(); } }

function drawScene(t) {
  renderer.info.reset(); skyTick(t); figTick(t);
  const inside = isInsideRoom(); const showCity = !inside; const showRoom = S.mode !== 'city' || CAM.position.distanceTo(_v.set(room.box.x, room.box.y + 2, room.box.z)) < 140;
  /* train runs by time alone */
  const period = 62; for (let i = 0; i < city.train.length; i++) { const a = trainPos(t / period - i * .0088); const m = city.train[i]; m.position.set(a.p[0], a.p[1] + .1, a.p[2]); m.rotation.y = Math.atan2(a.d[0], a.d[2]); m.updateMatrixWorld(true); }
  CAM.updateMatrixWorld();
  const sp = inside && room.def.view ? _vp.setFromMatrixPosition(streetCam(true).matrixWorld) : CAM.position;
  SHAFTS.forEach((s, i) => city.skyU.uShaft.value[i].set(s.e[0] - sp.x, s.e[1] - sp.y, s.e[2] - sp.z).normalize());
  /* reflections for wet ground and water */
  S.fc = (S.fc || 0) + 1;
  const reflNow = Q.refl;
  city.u.uReflOn.value = reflNow ? 1 : 0;
  /* standing in the shop the street only shows through glass: refresh it less often */
  const calm = S.mode === 'room' && !RIG;
  const reflEvery = RIG ? 1 : S.mode === 'fly' ? (isPhone ? 2 : 1) : S.idle ? (calm ? 3 : 2) : calm ? 4 : (isPhone ? 3 : 2);
  if (reflNow && (S.fc % reflEvery === 0 || !city.u.uRefl.value)) {
    const saveNear = CAM.near; const n = Math.max(saveNear, 1); setNear(n, CAM.far);
    renderer.setRenderTarget(RT.refl); renderer.setClearColor(0x05040a, 1); renderer.clear(true, true, false);
    renderer.render(SC.mirror, streetCam(inside)); setNear(saveNear, CAM.far);
    city.u.uRefl.value = RT.refl.texture;
  }
  city.u.uRes.value.set(inside ? RT.bg.width : S.W, inside ? RT.bg.height : S.H);
  if (inside) {
    /* the street, seen through glass, is drawn on its own at half size */
    const saveNear = CAM.near;
    if (!calm || S.idle || S.fc % 2 === 0 || !room.glassU.uBg.value) { setNear(1, room.def.view ? room.def.view.far : 900); windowRect(RT.bg);
    renderer.setRenderTarget(RT.bg); renderer.clear(true, true, false); renderer.render(SC.city, streetCam(inside)); setNear(saveNear, CAM.far); }
    room.glassU.uBg.value = RT.bg.texture; room.glassU.uInside.value = 1;
  } else room.glassU.uInside.value = 0;
  /* the mirror is drawn only while it can be seen */
  const mir = room.def.mirror; if (mir && showRoom && (inside || S.mode === 'room')) { const zm = mir[2]; _wr.set(mir[0], mir[1], zm).applyMatrix4(CAM.matrixWorldInverse); const seen = _wr.z < -.2; if (seen) { _wr.applyMatrix4(CAM.projectionMatrix); } if (seen && Math.abs(_wr.x) < 1.5 && (RIG || !room.mirDone || S.fc % (isPhone ? 3 : 2) === 0)) { room.mirDone = true; _rm.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 2 * zm, 0, 0, 0, 1); _mc.projectionMatrix.copy(CAM.projectionMatrix); _mc.projectionMatrixInverse.copy(CAM.projectionMatrixInverse); _mc.matrixWorldInverse.multiplyMatrices(CAM.matrixWorldInverse, _rm); _mc.matrixWorld.copy(_mc.matrixWorldInverse).invert(); renderer.setRenderTarget(RT.mir); renderer.setClearColor(0x0a1420, 1); renderer.clear(true, true, false); renderer.render(SC.roomMir, _mc); } }
  renderer.setRenderTarget(RT.main); renderer.setClearColor(0x05040a, 1); renderer.clear(true, true, false);
  /* from as far off as the window can be seen on the way in: nearer than that, the room would pop into it */
  const holed = showCity && showRoom && room.def.hole && CAM.position.x > room.def.window.x - .04 && CAM.position.distanceTo(_v.set(room.def.window.x, room.box.y + 1.4, room.box.z)) < 140;
  if (showCity) { city.rain.visible = !holed; renderer.render(SC.city, CAM); city.rain.visible = true; }
  if (showRoom) { if (holed) renderer.render(SC.hole, CAM); renderer.render(SC.room, CAM); }
  /* the hole resets depth in the window's shape, so rain goes on after the room, cut at the glass */
  if (holed) { const c = city.rain.material.uniforms.uCut.value; c.set(1, 0, 0, -room.def.window.x); renderer.render(city.rain, CAM); c.set(0, 0, 0, 1); }
  /* bloom */
  const u = MAT.post.m.uniforms;
  if (Q.bloom) {
    /* by day only what is really bright blooms, and less */
    MAT.bright.m.uniforms.t.value = RT.main.texture; MAT.bright.m.uniforms.th.value = .86 + SKY.L * .1; renderer.setRenderTarget(RT.b0); renderer.render(MAT.bright.s, fsCam);
    const br = MAT.blur.m.uniforms; br.t.value = RT.b0.texture; br.dir.value.set(1 / RT.b0.width, 0); renderer.setRenderTarget(RT.b1); renderer.render(MAT.blur.s, fsCam);
    br.t.value = RT.b1.texture; br.dir.value.set(0, 1 / RT.b0.height); renderer.setRenderTarget(RT.b0); renderer.render(MAT.blur.s, fsCam);
    br.t.value = RT.b0.texture; br.dir.value.set(2 / RT.b2.width, 0); renderer.setRenderTarget(RT.b2); renderer.render(MAT.blur.s, fsCam);
    br.t.value = RT.b2.texture; br.dir.value.set(0, 2 / RT.b2.height); renderer.setRenderTarget(RT.b3); renderer.render(MAT.blur.s, fsCam);
    u.tB.value = RT.b0.texture; u.tB2.value = RT.b3.texture; u.uBloom.value = (inside ? .34 : .42) * (1 - SKY.L * .75);
  } else { u.uBloom.value = 0; u.tB.value = RT.main.texture; u.tB2.value = RT.main.texture; }
  u.tC.value = RT.main.texture; u.tD.value = RT.main.depthTexture; u.nearZ.value = CAM.near; u.farZ.value = CAM.far; u.uInkOn.value = Q.ink ? 1 : 0;
  u.uGlitch.value = Math.max(0, 1 - (t - S.glitchT) / .42); u.uScan.value = clamp((t - S.scanT) / 1.1, 0, 1);
  renderer.setRenderTarget(RT.ldr); renderer.render(MAT.post.s, fsCam);
  const a = MAT.aa.m.uniforms; a.t.value = RT.ldr.texture; a.uGrain.value = Q.grain; renderer.setRenderTarget(null); renderer.render(MAT.aa.s, fsCam);
}
const _wr = new THREE.Vector3(), _rm = new THREE.Matrix4(), _mc = new THREE.PerspectiveCamera(); _mc.matrixWorldAutoUpdate = false;
/* a room can show the street from somewhere better than where it stands: the same camera, carried rigidly from his resting place to def.view.eye */
const _vc = new THREE.PerspectiveCamera(), _vp = new THREE.Vector3(); _vc.matrixWorldAutoUpdate = false;
function streetCam(inside) {
  const v = room.def.view; if (!inside || !v) return CAM;
  if (!v.T) { const b = room.box; v.T = new THREE.Matrix4().makeTranslation(v.eye[0], v.eye[1], v.eye[2]).multiply(new THREE.Matrix4().makeRotationY(v.theta)).multiply(new THREE.Matrix4().makeTranslation(-(b.x + v.from[0]), -(b.y + v.from[1]), -(b.z + v.from[2]))); }
  _vc.matrixWorld.multiplyMatrices(v.T, CAM.matrixWorld); _vc.matrixWorldInverse.copy(_vc.matrixWorld).invert();
  _vc.projectionMatrix.copy(CAM.projectionMatrix); _vc.projectionMatrixInverse.copy(CAM.projectionMatrixInverse);
  return _vc;
}
function windowRect(rt) {
  /* bounding box of the storefront on screen, in target pixels */
  const { x, zs, ys } = room.def.window; let x0 = 2, x1 = -2, y0 = 2, y1 = -2, full = false;
  for (const z of zs) for (const y of ys) { _wr.set(x, y, z).applyMatrix4(CAM.matrixWorldInverse); if (_wr.z > -.1) { full = true; continue; } _wr.applyMatrix4(CAM.projectionMatrix); x0 = Math.min(x0, _wr.x); x1 = Math.max(x1, _wr.x); y0 = Math.min(y0, _wr.y); y1 = Math.max(y1, _wr.y); }
  if (full) { rt.scissor.set(0, 0, rt.width, rt.height); return; }
  const X0 = Math.floor((clamp(x0, -1, 1) * .5 + .5) * rt.width) - 6, X1 = Math.ceil((clamp(x1, -1, 1) * .5 + .5) * rt.width) + 6, Y0 = Math.floor((clamp(y0, -1, 1) * .5 + .5) * rt.height) - 6, Y1 = Math.ceil((clamp(y1, -1, 1) * .5 + .5) * rt.height) + 6;
  rt.scissor.set(Math.max(0, X0), Math.max(0, Y0), Math.max(1, Math.min(rt.width, X1) - Math.max(0, X0)), Math.max(1, Math.min(rt.height, Y1) - Math.max(0, Y0)));
}
const isInsideRoom = () => { const p = CAM.position, b = room.box; return p.x < (room.def.hole ? room.def.window.x - .02 : b.x + b.w / 2 - .08) && p.x > b.x - b.w / 2 && p.z > b.z - b.d / 2 && p.z < b.z + b.d / 2 && p.y > b.y && p.y < b.y + b.h; };

/* 60 fps at most; after a few seconds untouched, 30 (Settings > Performance can lower both) */
function wake() { S.lastInput = performance.now(); if (S.idle) { S.idle = false; S.frames = 0; S.acc = 0; } }
function tick(now) {
  if (host.hidden) { looping = false; return; }
  if (S.lost) { S.last = now; requestAnimationFrame(tick); return; }
  if (!RIG) {
    S.idle = (S.mode === 'city' || S.mode === 'room') && now - S.lastInput > 6000;
    const iv = 1000 / (S.idle ? PM.idle : PM.fps), el = now - (S.drawn || 0);
    if (el < iv - 1.5) { requestAnimationFrame(tick); return; }
    S.drawn = el < iv * 2 ? S.drawn + iv : now;
  }
  const dt = Math.min(.1, (now - S.last) / 1000 || .016); S.last = now;
  S.t += dt; TIME.value = S.t;
  updateCamera(dt); drawScene(S.t); hudFrame(dt);
  S.frames++; S.acc += dt; if (S.acc > 1) { S.fpsNow = S.frames / S.acc; S.frames = 0; S.acc = 0; if (!S.idle) { S.fps = S.fpsNow; adapt(); } }
  if (!RIG) requestAnimationFrame(tick);
}
/* adaptive quality: step resolution first, then features */
let adaptCool = 2; const SCALES = [1, .86, .74, .64, .55];
perfPick(perf().pick); onPerf(o => perfPick(o.pick));
function adapt() {
  if (adaptCool > 0) { adaptCool--; return; }
  if (document.hidden) return;
  if (S.mode === 'fly') return;
  if (S.fps < PM.fps * .43) { if (S.restored) { S.restored = false; S.upNeed = Math.min(S.upNeed * 2, 120); } const i = SCALES.indexOf(Q.scale); const floor = S.mode === 'city' && !PM.weak ? 1 : SCALES.length - 1; if (i < floor) { Q.scale = SCALES[i + 1]; resize(); adaptCool = 3; } else if (Q.bloom) { Q.bloom = false; adaptCool = 3; } else if (Q.refl) { Q.refl = false; adaptCool = 3; } }
  else if (S.fps > PM.fps * .87) { const i = SCALES.indexOf(Q.scale); if ((i > 0 || (PM.fx && (!Q.bloom || !Q.refl))) && S.upHold++ > S.upNeed) { if (!PM.fx && i > 0) { Q.scale = SCALES[i - 1]; resize(); } else if (!Q.refl) Q.refl = true; else if (!Q.bloom) Q.bloom = true; else { Q.scale = SCALES[i - 1]; resize(); } adaptCool = 4; S.upHold = 0; S.restored = true; } }
  else S.upHold = 0;
}
S.upHold = 0; S.upNeed = 4; S.lastInput = 0;
function info() { const r = renderer.info.render; return { calls: r.calls, tris: r.triangles, fps: Math.round(S.fpsNow || S.fps), scale: Q.scale, w: S.W, h: S.H }; }
const HOT = [];
const _pv = new THREE.Vector3();
function project(p) { _pv.set(p[0], p[1], p[2]).project(CAM); return { x: (_pv.x * .5 + .5) * innerWidth, y: (-_pv.y * .5 + .5) * innerHeight, z: _pv.z, on: _pv.z < 1 && _pv.z > -1 }; }

/* ---------- HUD: everything over the 3D ---------- */
const hudEl = $('#hud');
function setBoot(t, p) { const a = $('#bootT'), b = $('#bootB'); if (a) a.textContent = t.toUpperCase(); if (b) b.style.width = (p * 100) + '%'; }
const ICONS = [
  { k: 'plan', room: 'apartment', attr: 'focus', word: 'Plan', c: '#16e4f4', d: 'HOME · TASKS', r: 'TASKS ', svg: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>' },
  { k: 'work', room: 'shop', attr: 'grind', word: 'Work', c: '#f6ee1c', d: 'SHOP · SHIFTS', r: 'HOURS ', svg: '<path d="M12 8V6a2 2 0 1 1 2 2c-1 0-2 1-2 2M12 10 3 17v2h18v-2z"/>' },
  { k: 'train', room: 'gym', attr: 'strength', word: 'Train', c: '#ff8a1e', d: 'GYM · LIFTS', r: 'DONE ', svg: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>' },
  { k: 'fuel', room: 'chalet', attr: 'fuel', word: 'Fuel', c: '#f6ee1c', d: 'CHALET · FOOD', r: 'SHAKES ', svg: '<path d="M3 11h18a9 9 0 0 1-18 0zM8 3c-1 2 1 3 0 5M13 3c-1 2 1 3 0 5M18 4 13 11"/>' },
  { k: 'school', room: 'castle', attr: 'hustle', word: 'School', c: '#4cdc8e', d: 'CASTLE · SCHOOL', r: 'STUDY ', svg: '<path d="M4 20V9h3V6h2v3h6V6h2v3h3v11zM10 20v-5h4v5"/>' },
];

function ringHTML(id, val, sub) {
  const r = 42; const C = TAU * r;
  let ticks = ''; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, big = i % 6 === 0; const r0 = big ? 46 : 47.4; ticks += `<line x1="${50 + Math.cos(a) * r0}" y1="${50 + Math.sin(a) * r0}" x2="${50 + Math.cos(a) * 49.5}" y2="${50 + Math.sin(a) * 49.5}" stroke="#ff4646" stroke-width="${big ? 1.1 : .55}" opacity="${big ? .95 : .5}"/>`; }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${ticks}<circle cx="50" cy="50" r="${r}" fill="#0b0a10" stroke="#ff4646" stroke-opacity=".18" stroke-width="5"/><circle class="arc" cx="50" cy="50" r="${r}" fill="none" stroke="#ff4646" stroke-width="5" stroke-dasharray="${C * val} ${C}"/><circle cx="50" cy="50" r="33.5" fill="none" stroke="#ff4646" stroke-opacity=".55" stroke-width=".7" stroke-dasharray="1.2 3"/><circle class="arc2" cx="50" cy="50" r="30" fill="none" stroke="#ff4646" stroke-width="1.6" stroke-dasharray="${TAU * 30 * .16} ${TAU * 30}"/></svg><b>${id}</b><small>${sub}</small>`;
}
function setRing(el, txt, val) { el.querySelector('b').textContent = txt; const a = el.querySelector('.arc'); a.setAttribute('stroke-dasharray', `${TAU * 42 * val} ${TAU * 42}`); }
function barInto(el, n, v) { let h = ''; for (let i = 0; i < n; i++) h += `<i class="${i / n < v ? 'on' : ''}"></i>`; el.innerHTML = h; }
function setBar(el, v) { const a = el.children, n = a.length; for (let i = 0; i < n; i++) a[i].classList.toggle('on', i / n < v); }
function sqInto(el, n, k) { let h = ''; for (let i = 0; i < n; i++) h += `<i class="${i < k ? 'on' : ''}"></i>`; el.innerHTML = h; }
const pct01 = v => clamp(+v || 0, 0, 1);
const setText = (id, t) => { const el = $(id); if (el && el.textContent !== t) el.textContent = t; };
const setHTML = (id, h) => { const el = $(id); if (el && el._h !== h) { el._h = h; el.innerHTML = h; } };
/* swaps only the rows that changed: a finger already on another row keeps its button, so the app's render can't cancel the tap */
const setRows = (id, h) => { const el = $(id); if (!el || el._h === h) return; el._h = h; const t = document.createElement('template'); t.innerHTML = h; const a = el.children, n = t.content.children; if (a.length !== n.length) { el.innerHTML = h; return; } for (let i = n.length - 1; i >= 0; i--) if (!a[i].isEqualNode(n[i])) a[i].replaceWith(n[i]); };
const chkHTML = rows => rows.map(([ok, label, tag]) => `<div class="chk"><i${ok ? '' : ' class="w"'}></i><span>${label}</span><span class="mi">${tag}</span></div>`).join('');
const hms = ms => { const s = Math.floor(ms / 1000); return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

let tagEls = [], iconEls = [], EQ = {}, sel = 1, selT = 0, kick = 0;
let HOME = null, WORK = null, CLOCK = { on: false, brk: false, ms: 0 }, clockSeen = null;

function wave(cv, draw) { const r = cv.getBoundingClientRect(); const dpr = Math.min(DPR, 2); const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr)); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } const x = cv.getContext('2d'); x.clearRect(0, 0, w, h); draw(x, w, h, dpr); }
function drawEq(x, w, h, dpr, t) {
  const n = Math.max(14, Math.floor(w / (dpr * 5))); const bw = w / n; const seg = 6;
  for (let i = 0; i < n; i++) {
    const v = EQ.v[i % EQ.v.length]; const on = Math.round(v * seg);
    for (let s = 0; s < seg; s++) { const yy = h - (s + 1) * h / seg + 1; x.fillStyle = s < on ? (s >= seg - 1 ? '#f2dd3d' : '#ff4646') : 'rgba(255,70,70,.13)'; x.fillRect(i * bw + dpr * .4, yy, bw - dpr * 1.4, h / seg - dpr * 1.1); }
  }
}
function drawWave(x, w, h, dpr, t, c = '#ff4646', amp = 1, seed = 0) {
  x.strokeStyle = 'rgba(255,70,70,.2)'; x.lineWidth = dpr * .6; x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
  x.strokeStyle = c; x.lineWidth = dpr * 1.1; x.beginPath();
  for (let i = 0; i <= 64; i++) { const u = i / 64; const env = Math.sin(u * Math.PI); const y = h / 2 + (Math.sin(u * 19 + t * 5.3 + seed) * .36 + Math.sin(u * 53 - t * 9.1 + seed * 2) * .28 * Math.sin(t * 1.3 + seed) + Math.sin(u * 7 + t * 2.1) * .2) * env * h * .46 * amp * (1 + kick * .6); if (i) x.lineTo(u * w, y); else x.moveTo(u * w, y); }
  x.stroke();
}
function eqStep(dt, t) {
  /* a layered signal that really moves; jumps when something happens */
  const n = EQ.v.length; const beat = Math.pow(Math.max(0, Math.sin(t * 3.7)), 6);
  for (let i = 0; i < n; i++) {
    const u = i / n; const tgt = clamp(.16 + .42 * Math.abs(Math.sin(t * 2.3 + i * .6 + Math.sin(t * .7 + i))) * (1 - u * .5) + .26 * Math.abs(Math.sin(t * 7.1 + i * 2.7)) * Math.sin(u * Math.PI) + beat * .3 * (1 - u) + kick * .6 * Math.random());
    EQ.v[i] += (tgt - EQ.v[i]) * (tgt > EQ.v[i] ? .55 : .14);
  }
  kick = Math.max(0, kick - dt * 1.6);
}
function glitchHud(force = 1) { kick = 1; if (REDUCED) return; hudEl.classList.remove('gl'); void hudEl.offsetWidth; hudEl.classList.add('gl'); clearTimeout(S.glOff); S.glOff = setTimeout(() => hudEl.classList.remove('gl'), 380); if (force >= 1) S.glitchT = S.t; }
function scanNow() { S.scanT = S.t; const s = $('#scan'); s.classList.remove('go'); void s.offsetWidth; s.classList.add('go'); s.onanimationend = () => s.classList.remove('go'); }
function setMode(m) { S.mode = m; SKY.next = 0; S.lastInput = S.modeT = performance.now(); hudEl.classList.remove('city', 'fly', 'room'); hudEl.classList.add(m); }
/* Buttons appear under the finger on arrival, and a touch's click lands after the mode has changed. Nobody means to press what they cannot have seen yet. */
const justArrived = () => S.mode !== 'fly' && performance.now() - (S.modeT || 0) < 350;

/* hotspot tags: one per object in the room, rebuilt when a room loads */
function buildTags() {
  const tw = $('#tags'); tw.textContent = ''; tagEls = []; clockSeen = null;
  room.hot.forEach(h => {
    const b = document.createElement('button'); b.className = 'tag'; b.type = 'button'; b.dataset.k = h.key; b.setAttribute('aria-label', h.label);
    b.innerHTML = `<span class="lbl"><span><b>${h.label}</b><small hidden></small><span class="key" aria-hidden="true">${h.hotkey}</span></span></span><i class="ln" style="--h:${h.line}px"></i><i class="tk"></i>`;
    b.addEventListener('click', () => { if (S.drag && S.drag.moved) return; tapHot(h.key); });
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !S.drag) APP.sfx('spot'); }); b.addEventListener('focus', () => { if (b.matches(':focus-visible')) APP.sfx('spot'); });
    tw.appendChild(b); tagEls.push({ el: b, h, line: h.line });
  });
}

function hudInit() {
  /* icons */
  const wrap = $('#icons');
  ICONS.forEach(o => {
    const b = document.createElement('button'); b.className = 'ic'; b.type = 'button'; b.dataset.k = o.attr; b.style.setProperty('--acc', o.c); b.style.setProperty('--c', o.c); b.setAttribute('aria-label', o.word + ', ' + o.d.toLowerCase());
    b.innerHTML = `<span class="plate"><svg viewBox="0 0 24 24">${o.svg}</svg></span><span class="lab">${o.word}<small>${o.r}</small></span><i class="edgea"></i><i class="tk"></i>`;
    if (o.k === 'work') b.insertAdjacentHTML('afterbegin', '<i class="live" aria-hidden="true" hidden></i>');
    b.addEventListener('click', () => { if (S.drag && S.drag.moved) return; tapIcon(o.k); });
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !S.drag && S.mode === 'city') APP.sfx('hover'); }); b.addEventListener('focus', () => { if (b.matches(':focus-visible')) APP.sfx('hover'); });
    wrap.appendChild(b); const ns = 'http://www.w3.org/2000/svg', ld = document.createElementNS(ns, 'path'), dt = document.createElementNS(ns, 'rect'); dt.setAttribute('width', 5); dt.setAttribute('height', 5); ld.style.setProperty('--acc', o.c); dt.style.setProperty('--acc', o.c); $('#leaders').append(ld, dt); iconEls.push({ el: b, a: ANCHORS[o.k], k: o.k, ld, dt, sm: b.querySelector('small'), o });
  });
  buildTags();
  /* readouts */
  $('#ringA').innerHTML = ringHTML('0', 0, 'PROGRESS'); $('#ringB').innerHTML = ringHTML('0', 0, 'PERIOD'); $('#ringC').innerHTML = ringHTML('0', 0, '% GOAL');
  barInto($('#bG'), 18, 0); S.ringIn = 0; for (const id of ['#cellsA', '#cellsB']) { const el = $(id); el.innerHTML = '<i class="on"></i>'.repeat(3) + '<i></i>'.repeat(1); }
  barInto($('#bH1'), 18, 0); barInto($('#bH2'), 18, 0); barInto($('#bY1'), 18, 0); for (const k of ['#bK1', '#bK2', '#bK3', '#bK4']) barInto($(k), 18, 0);
  $('#btnGymSheet').addEventListener('click', () => openSheet('cSess'));
  $('#btnChSheet').addEventListener('click', () => openSheet('cList'));
  for (const k of ['#bS1', '#bS2', '#bS3', '#bS4']) barInto($(k), 18, 0);
  castleInit();
  /* the chalet does the Fuel and Cardio pages' own things in place: a shake, a tick on the list, a snack, a meal picked, a recipe read, cardio logged */
  hudEl.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-fshake],[data-fgroc],[data-fclear],[data-fsnack],[data-fpick],[data-fopen],[data-fcat],[data-fback],[data-ftype]'); if (!b) return; const d = b.dataset;
    if (d.fshake) { APP.shake(d.fshake); return; }
    if (d.fgroc) { const on = b.classList.toggle('on'); b.setAttribute('aria-pressed', String(on)); $('#flRows')._h = null; APP.groc(d.fgroc); return; }
    if (d.fclear !== undefined) { APP.grocClear(); return; }
    if (d.fsnack) { APP.snack(d.fsnack); return; }
    if (d.fpick) { APP.pick(d.fpick); return; }
    if (d.fopen) { chRecipe = d.fopen; refreshChalet(); const sc = $('#sheetScroll'); if (sc) sc.scrollTop = 0; requestAnimationFrame(() => { const t = $('#fmBack'); if (t) t.focus({ preventScroll: true }); }); return; }
    if (d.fback !== undefined) { const was = chRecipe; chRecipe = null; refreshChalet(); requestAnimationFrame(() => { const t = [...ROOT.querySelectorAll('[data-fopen]')].find(x => x.dataset.fopen === was); if (t) t.focus({ preventScroll: false }); }); return; }
    if (d.fcat) { chCat = d.fcat; refreshChalet(); return; }
    if (d.ftype) { APP.cardioType(d.ftype); ROOT.querySelectorAll('[data-ftype]').forEach(x => { const on = x === b; x.classList.toggle('ol', !on); x.setAttribute('aria-pressed', String(on)); }); const t = $('#fcType'); if (t) t.value = ''; return; }
  });
  /* the gym's rest buttons start the app's own rest timer, the one the island counts down between sets */
  hudEl.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-rest],[data-gset],[data-gdone],[data-gday],[data-gpick],[data-gex]'); if (!b) return; const d = b.dataset;
    if (d.gex) { if (!gymOpen.delete(d.gex)) gymOpen.add(d.gex); refreshGym(); return; }
    if (d.gpick) { APP.sessPick(d.d, d.gpick); return; }
    if (d.rest) { APP.rest(+d.rest); restSeen = -1; return; }
    /* a set flips at once; the app's own tick (sound, rest timer, sync) follows */
    if (d.gset) { const [i, j] = d.gset.split(':').map(Number), on = b.classList.toggle('on'); b.setAttribute('aria-pressed', String(on)); $('#ssRows')._h = null; APP.set(d.s, i, j); return; }
    if (d.gdone) { APP.sessDone(d.gdone); return; }
    if (d.gday !== undefined) { gymDay = d.gday || null; refreshGym(); showCard('cSess'); }
  });
  /* the apartment's and the shop's editors: tasks, notes, shifts, all in place */
  const focusIn = sel => requestAnimationFrame(() => { const el = ROOT.querySelector(sel); if (el) { el.focus({ preventScroll: false }); if (el.setSelectionRange && el.type === 'text') el.setSelectionRange(el.value.length, el.value.length); } });
  hudEl.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-topen],[data-tw],[data-tcat],[data-trep],[data-tdel],[data-nopen],[data-npin],[data-ndel],[data-spre],[data-sclr],[data-shday],[data-pp],[data-wlast],[data-wcopy],[data-late],[data-aw]'); if (!b) return; const d = b.dataset;
    if (d.topen) {
      const k = d.topen + '|' + d.date;
      /* from the panel: the sheet opens on today, that task's editor open */
      if (b.closest('#aptList')) { aptOpen = k; openSheet('cToday'); return focusIn(`#tdRows [data-tt="${d.topen}"]`); }
      aptOpen = aptOpen === k ? null : k; refreshApt(); if (aptOpen) focusIn(`[data-tt="${d.topen}"]`); return;
    }
    if (d.tw) { const [id, when] = d.tw.split(':'); aptOpen = null; APP.taskSet(id, { when }); return; }
    if (d.tcat) { const [id, cat] = d.tcat.split(':'); APP.taskSet(id, { cat }); return; }
    if (d.trep) { const [id, repeat] = d.trep.split(':'); APP.taskSet(id, { repeat }); return; }
    if (d.tdel) { aptOpen = null; APP.taskDel(d.tdel); return; }
    if (d.nopen) { aptNote = aptNote === d.nopen ? null : d.nopen; refreshApt(); if (aptNote) focusIn(`[data-nt="${d.nopen}"]`); return; }
    if (d.npin) { APP.notePin(d.npin); return; }
    if (d.ndel) { aptNote = null; APP.noteDel(d.ndel); return; }
    if (d.shday) { shopDay = d.shday; refreshWork(); return; }
    if (d.pp !== undefined) { shopP = d.pp || null; shopDay = null; refreshWork(); return; }
    if (d.wlast) { APP.copyLastWeek(d.wlast); return; }
    if (d.wcopy) { APP.copyPeriod(shopP); return; }
    if (d.late) { APP.rollover(); return; }
    if (d.aw !== undefined) { const v = +d.aw, m = aptWeek ? new Date(aptWeek + 'T12:00') : new Date(); m.setDate(m.getDate() + 7 * v); aptWeek = v === 0 ? null : `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`; aptDay = null; refreshApt(); return; }
    const sd = b.closest('[data-sdate]'); if (!sd) return;
    if (d.spre) { const [start, end, brk] = d.spre.split('|'); APP.shiftSet(sd.dataset.sdate, { start, end, brk }); return; }
    if (d.sclr) APP.shiftClear(sd.dataset.sdate);
  });
  hudEl.addEventListener('change', e => {
    const el = e.target, d = el.dataset || {};
    if (d.gtpl !== undefined) { el.blur(); return APP.tplSet(d.gtpl, el.value); }
    if (d.tt !== undefined) return APP.taskSet(d.tt, { title: el.value });
    if (d.trem !== undefined) return APP.taskSet(d.trem, { remind: el.value });
    if (d.tdate !== undefined) { if (!el.value) return; const [k] = (aptOpen || '').split('|'); if (k === d.tdate) aptOpen = null; return APP.taskSet(d.tdate, { date: el.value }); }
    if (d.nt !== undefined) { clearTimeout(noteT); return APP.noteSet(d.nt, el.value, true); }
    if (d.sx) { const sd = el.closest('[data-sdate]'); if (sd) APP.shiftSet(sd.dataset.sdate, { [d.sx]: el.value }); }
  });
  /* a note saves as he types, a beat behind */
  let noteT = 0;
  hudEl.addEventListener('input', e => { const el = e.target; if (!el.dataset || el.dataset.nt === undefined) return; clearTimeout(noteT); noteT = setTimeout(() => APP.noteSet(el.dataset.nt, el.value), 400); });
  /* Enter in a one-line box is done with it */
  hudEl.addEventListener('keydown', e => { const el = e.target; if (e.key === 'Enter' && el.dataset && (el.dataset.tt !== undefined || el.dataset.sx)) { e.preventDefault(); el.blur(); } });
  /* leaving a box: the parts of the sheet held still while he typed catch up */
  hudEl.addEventListener('focusout', e => { if (e.target.matches && e.target.matches('.hin')) setTimeout(() => { if (!typing('#sheet')) { refreshRoom(); refreshWork(); } }, 60); });
  hudEl.addEventListener('submit', e => {
    const f = e.target; if (!f.dataset || (f.dataset.hadd === undefined && !f.dataset.nadd)) return; e.preventDefault();
    const inp = f.querySelector('.hin'), ok = f.dataset.nadd ? APP.noteAdd(inp.value) : APP.addTask(inp.value, f.dataset.hadd || null);
    if (ok) inp.value = ''; inp.focus();
  });
  /* the top bar's own: quick add, progress, system */
  hudEl.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-hud],[data-sact],[data-jst],[data-jdel]'); if (!b) return; const d = b.dataset;
    if (d.hud) return openGlobal(d.hud);
    /* a system switch runs the app's own action, then the card redraws to show it */
    if (d.sact) { APP.act(d.sact, d.v !== undefined ? { v: d.v } : {}); setTimeout(() => refreshGlobal('sys'), 120); setTimeout(() => refreshGlobal('sys'), 1500); return; }
    if (d.jst) { const [id, st] = d.jst.split('|'); APP.jobStatus(id, st); return; }
    if (d.jdel) APP.jobDel(d.jdel);
  });
  hudEl.addEventListener('change', e => { const el = e.target; if (el.id === 'gRingF') { const f = el.files && el.files[0]; el.value = ''; if (f) Promise.resolve(APP.ownPick(f)).then(() => refreshGlobal('sys')); return; } if (el.dataset && el.dataset.set) APP.setting(el.dataset.set, el.value); });
  hudEl.addEventListener('input', e => { if (e.target.id === 'gAddI') quickPrev(); });
  hudEl.addEventListener('submit', e => {
    const f = e.target;
    if (f.id === 'gAddF') { e.preventDefault(); const i = $('#gAddI'); if (APP.quick(i.value)) { i.value = ''; quickPrev(); } i.focus(); return; }
    if (f.id === 'gSyncF') { e.preventDefault(); const i = $('#gSyncI'); if (APP.syncOn(i.value)) { i.value = ''; i.blur(); setTimeout(() => refreshGlobal('sys'), 300); } return; }
    if (f.id === 'crAdd') { e.preventDefault(); if (APP.jobAdd(f.company.value, f.role.value, f.link.value)) { f.reset(); f.company.focus(); } else f.company.focus(); }
  });
  /* a benchmark logs from its own box */
  hudEl.addEventListener('submit', e => {
    const fc = e.target.closest && e.target.closest('[data-fcardio]');
    if (fc) { e.preventDefault(); const typed = fc.elements.type.value.trim(), on = ROOT.querySelector('[data-ftype][aria-pressed="true"]'); if (APP.cardio(typed || (on && on.dataset.ftype) || '', fc.elements.min.value, fc.elements.dist.value)) { fc.elements.min.value = ''; fc.elements.dist.value = ''; fc.elements.type.value = ''; fc.elements.min.blur(); } else fc.elements.min.focus(); return; }
    const f = e.target.closest && e.target.closest('[data-gbench]'); if (!f) return; e.preventDefault();
    const inp = f.querySelector('input'); if (APP.bench(f.dataset.gbench, inp.value)) { inp.value = ''; inp.blur(); } else inp.focus();
  });
  barInto($('#bA'), 18, 0); barInto($('#bB'), 18, 0); barInto($('#bC'), 18, 0); barInto($('#bD'), 18, 0); barInto($('#bE'), 18, 0); barInto($('#bF'), 18, 0);
  sqInto($('#sqA'), 9, 6); sqInto($('#sqB'), 9, 3);
  /* ladder on the side, laptop only */
  let lad = ''; for (let i = 0; i <= 20; i++) { const y = 5 + i * 10, big = i % 5 === 0; lad += `<line x1="${big ? 18 : 28}" y1="${y}" x2="44" y2="${y}" stroke="#ff4646" stroke-width="${big ? 1.4 : .7}" opacity="${big ? .9 : .45}"/>${big ? `<text x="0" y="${y + 3}" fill="#ff4646" font-size="8" font-family="${FONT_MONO.replace(/"/g, '')}">${(20 - i) * 30}</text>` : ''}`; } lad += '<path d="M46 100l-9-5v10z" fill="#f2dd3d"/>'; $('#ladL').innerHTML = lad;
  EQ.v = new Array(48).fill(.2);
  $('#btnQ').addEventListener('click', () => { const p = $('#perf'); p.hidden = !p.hidden; $('#btnQ').setAttribute('aria-pressed', String(!p.hidden)); });
  $('#btnBack').addEventListener('click', goBack);
  $('#btnSheet').addEventListener('click', () => openSheet('cClock'));
  $('#btnClose').addEventListener('click', () => closeSheet());
  $('#shTabs').addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-tab]'); if (t) { showCard(t.dataset.tab); const n = $(`#shTabs [data-tab="${t.dataset.tab}"]`); if (n) n.focus({ preventScroll: true }); } });
  $('#btnClock').addEventListener('click', tapClock);
  $('#btnAptSheet').addEventListener('click', () => openSheet('cToday'));
  /* the apartment's rows: the tick flips at once, and refreshApt keeps every row where it was until he leaves */
  hudEl.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-tick],[data-task],[data-dec],[data-day]'); if (!b) return;
    const d = b.dataset;
    if (d.tick) { aptKeep.add(d.tick + '|' + d.date); APP.tick(d.tick, d.date); const r = b.closest('.trow'), on = r.classList.toggle('done'); b.setAttribute('aria-label', b.getAttribute('aria-label').replace(/^Mark (not )?done/, 'Mark ' + (on ? 'not done' : 'done'))); kick = 1; for (const id of ['#aptList', '#tdRows', '#wkDay']) $(id)._h = null; return; }
    if (d.dec) return APP.decide(d.dec, d.id);
    aptDay = d.day; refreshApt();
  });
  hudEl.addEventListener('click', e => { if (justArrived()) { e.stopPropagation(); e.preventDefault(); } }, true);
  /* A held Enter would click again with every repeat, and focus moving between WORK and close would flap the sheet. */
  hudEl.addEventListener('keydown', e => { if (e.repeat && e.key === 'Enter' && e.target.closest('button')) e.preventDefault(); }, true);
  /* anything marked data-act runs the app's own action */
  ROOT.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-act]'); if (!el) return;
    APP.act(el.dataset.act, { ...el.dataset });
  });
  /* capture: this has to see an open sheet before the app's own Escape closes it */
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tg = e.composedPath()[0]; if (tg && tg.matches && tg.matches('input,textarea,select')) return;
    if (e.key === 'Escape' && S.mode === 'fly' && S.fly && S.fly.dir > 0) return goBack();
    if (S.mode !== 'room') return;
    if (e.key === 'Escape') { if (S.sheet) closeSheet(); else goBack(); return; }
    /* V: in on her and back out */
    if (e.key.toLowerCase() === 'v' && !S.sheet && room.def.figure && room.def.figure.close) { e.stopPropagation(); e.preventDefault(); if (S.close) stepBack(); else closeUp(true); return; }
    if (S.close && !S.sheet && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.stopPropagation(); e.preventDefault(); S.spinGoal += (e.key === 'ArrowRight' ? 1 : -1) * Math.PI / 4; return; }
    if (S.close) return;
    const h = room.hot.find(x => x.hotkey.toLowerCase() === e.key.toLowerCase()); if (h && !S.sheet) { e.stopPropagation(); e.preventDefault(); tapHot(h.key); }
  }, true);
  addEventListener('popstate', () => {
    /* back out of the close-up first; forward into it again */
    const cl = !!(history.state && history.state.close);
    if (S.close && !cl && history.state && history.state.city === room.id) { closeUp(false, true); return; }
    if (!S.close && cl && S.mode === 'room' && history.state.city === room.id) { closeUp(true, true); return; }
    const inRoom = S.mode === 'room' || (S.mode === 'fly' && S.fly && S.fly.dir > 0), want = history.state && history.state.city;
    if (want && !inRoom) flyIn(want, false); else if (!want && inRoom) flyOut();
  });
  /* drag: small orbit in the city, look around in the room; vertical stays with the page */
  const dom = canvas;
  dom.addEventListener('pointerdown', e => { S.drag = { x: e.clientX, y: e.clientY, a: S.azGoal, e: S.elGoal, yaw: S.yawGoal, spin: S.spinGoal, moved: false, id: e.pointerId, t: performance.now(), mode: S.mode }; try { dom.setPointerCapture(e.pointerId); } catch (_) {} });
  dom.addEventListener('pointermove', e => { const d = S.drag; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 8) d.moved = true; if (S.mode === 'city') { S.azGoal = clamp(d.a - dx * .0016, -.3, .3); if (e.pointerType === 'mouse') S.elGoal = clamp(d.e + dy * .0024, -.3, .4); } else if (S.mode === 'room' && !S.sheet && !S.close) { S.yawGoal = clamp(d.yaw + dx * (isPhone ? .0052 : .0028), -.61, .61); S.lastDrag = performance.now(); } else if (S.mode === 'room' && !S.sheet && S.close && d.moved) S.spinGoal = d.spin + dx * (isPhone ? .016 : .009); });
  const up = e => { const d = S.drag; S.drag = null; if (!d) return; if (!d.moved && d.mode === S.mode && performance.now() - d.t < 500) tapWorld(e.clientX, e.clientY); else S.lastDrag = performance.now(); };
  dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', () => { S.drag = null; S.lastDrag = performance.now(); });
  addEventListener('resize', () => { if (host.hidden) S.sizeStale = true; else resize(); });
  document.addEventListener('visibilitychange', () => { S.last = performance.now(); if (document.hidden) S.away = true; });
  S.lastDrag = 0;
  for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart']) addEventListener(ev, wake, { passive: true, capture: true });
  setRealClock(); setInterval(setRealClock, 1000);
}
function setRealClock() { const d = new Date(), mo = d.toLocaleString('en', { month: 'short' }).toUpperCase(), dd = String(d.getDate()).padStart(2, '0'), hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0'); setText('#clk', hh + ':' + mm); setText('#clkd', mo + '.' + dd); setText('#nA', mo + ' ' + dd); setText('#nB', hh + ' ' + mm); setText('#nC', mo + ' ' + dd); setText('#nD', hh + ' ' + mm); }
function tapWorld(x, y) {
  if (justArrived()) return;
  if (S.mode === 'fly') { skipFlight(); return; }
  if (S.mode === 'city') { let best = null, bd = 56; for (const o of iconEls) { const p = project(o.a); const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = o; } } if (best) tapIcon(best.k); return; }
  if (S.mode === 'room' && !S.sheet) {
    /* close up, a tap anywhere steps back */
    if (S.close) { stepBack(); return; }
    let best = null, bd = 44; for (const o of room.hot) { const p = project(o.p); const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = o; } } if (best) { tapHot(best.key); return; }
    if (onHer(x, y)) closeUp(true);
  }
}
/* is (x, y) on her? Her posed box, on screen, a little generous */
function onHer(x, y) {
  if (!FIG || !FIG.root.visible || !room.def.figure || !room.def.figure.close) return false;
  const b = FIG.keys[FIG.i].box; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let k = 0; k < 8; k++) { const p = project([room.box.x + b[k & 1][0], room.box.y + b[k & 2 ? 1 : 0][1], room.box.z + b[k & 4 ? 1 : 0][2]]); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  return x > x0 - 8 && x < x1 + 8 && y > y0 - 8 && y < y1 + 8;
}
/* the close-up: the view moves in on her and she turns to him. It has its own history entry, so back steps out of it first */
function closeUp(on, pop) {
  if (on === S.close) return;
  if (on) { if (S.mode !== 'room' || S.sheet || !FIG || !room.def.figure || !room.def.figure.close) return; if (!pop) history.pushState({ city: room.id, close: 1 }, ''); }
  if (!on) { const T = Math.PI * 2; S.spin = ((S.spin % T) + T + Math.PI) % T - Math.PI; }
  S.close = on; figClose(on); hudEl.classList.toggle('close', on); $(room.def.panel).inert = on; $('#herBox').setAttribute('aria-hidden', String(!on)); if (on) herCard();
  const h = $('#hint'); h.textContent = on ? 'DRAG TO TURN HER · TAP TO STEP BACK' : 'DRAG TO LOOK'; h.style.opacity = 1; clearTimeout(S.hintT); S.hintT = setTimeout(() => { h.style.opacity = 0; }, on ? 2600 : 1800);
  glitchHud(.2); APP.sfx(on ? 'open' : 'back');
}
/* her card: mood follows his day (today's tasks done), link his overall progress; the pose line follows her */
const HER_POSE = { closeWave: 'HELLO', closeHips: 'HANDS ON HIPS', closeHair: 'HAND IN HAIR', closeFold: 'ARMS FOLDED', closeShoulder: 'OVER THE SHOULDER' };
function herCard() {
  try {
    const P = APP.plan(), n = P.today.length, mood = n ? .35 + .65 * P.done / n : .8, link = HOME ? pct01(HOME.overall) : 0;
    setBar($('#bH1'), mood); setText('#vH1', String(Math.round(mood * 100))); setBar($('#bH2'), link); setText('#vH2', Math.round(link * 100) + '%');
    sqInto($('#sqH'), 5, Math.max(1, Math.round(mood * 5)));
  } catch (e) { APP.log(e); }
  herPose();
}
function herPose() {
  if (!FIG) return; const j = FIG.go ? FIG.go.j : FIG.i, k = FIG.keys[j]; if (!k.close) return;
  setText('#hPose', HER_POSE[k.pose] || 'HELLO'); setText('#hPoseN', `POSE ${String(j - FIG.nS + 1).padStart(2, '0')}/${String(FIG.keys.length - FIG.nS).padStart(2, '0')}`);
}
function stepBack() { if (history.state && history.state.close) history.back(); else closeUp(false); }
/* leaving the room from close up: no pull back, she's simply where the clock says */
function closeReset() { S.spin = S.spinGoal = 0; if (!S.close && !S.closeK) return; S.close = false; S.closeK = 0; figClose(false, true); hudEl.classList.remove('close'); $('#herBox').setAttribute('aria-hidden', 'true'); const p = room.def && $(room.def.panel); if (p) p.inert = false; applyFov(); }
function tapIcon(k) {
  if (S.mode !== 'city') return;
  const e = iconEls.find(i => i.k === k);
  if (!e.o.room) return;
  /* a build that fails must not leave him stuck: he stays in the city, and it's logged */
  try { loadRoom(e.o.room); } catch (x) { APP.log(x); APP.toast('That room could not load'); APP.sfx('error'); return; }
  APP.sfx('tap', { room: e.o.room });
  flyIn(e.o.room);
}
/* A room gets a history entry, so browser back flies out the same way as ‹ and Escape. */
function flyIn(id, push = true) {
  if (S.mode === 'fly' && S.fly) S.fly.dir = 1;
  else { closeSheet(true); aptOrd.clear(); loadRoom(id); refreshRoom(); flightRes(true); makeFlight(1, restYaw()); setMode('fly'); glitchHud(1); S.scanT = -9; }
  if (push) history.pushState({ city: id }, '');
  setTimeout(() => { if (S.mode === 'fly' && S.fly && S.fly.dir > 0) APP.sfx('fly'); }, 100);
}
function flyOut() {
  closeReset();
  const y = S.mode === 'room' ? S.yaw : 0;
  closeSheet(true); S.yaw = S.yawGoal = 0;
  if (S.mode === 'fly' && S.fly) S.fly.dir = -1;
  else { flightRes(true); makeFlight(-1, y); setMode('fly'); glitchHud(1); }
  APP.sfx('exit');
}
function goBack() { if (S.close) return stepBack(); if (history.state && history.state.city) history.back(); else flyOut(); }
function skipFlight() { if (S.fly) { S.fly.u = S.fly.dir > 0 ? 1 : 0; } }
function enterRoom() { const y = S.fly && S.fly.yaw || 0; S.fly = null; flightRes(false); setMode('room'); APP.sfx('land', { room: room.id }); if (room.id === 'apartment') { const at = S.modeT; setTimeout(() => { if (S.mode === 'room' && room.id === 'apartment' && S.modeT === at && APP.ring) APP.ring(); }, 1000); } S.ringIn = S.t; S.yaw = y; S.yawGoal = RIG ? y : restYaw(); S.lastDrag = performance.now(); scanNow(); glitchHud(1); applyFov(); room.setDoor(0); tagEls.forEach((t, i) => { t.el.classList.remove('hot'); t.el.classList.add('hot'); setTimeout(() => t.el.classList.remove('hot'), 900 + i * 120); }); const b = $(room.def.panel); b.classList.remove('rvl'); void b.offsetWidth; b.classList.add('rvl'); $('#hint').style.opacity = 1; setTimeout(() => { $('#hint').style.opacity = 0; }, 3600); }
function enterCity() { aptKeep.clear(); aptOrd.clear(); aptDay = null; gymDay = null; shopDay = null; aptWeek = null; shopP = null; aptOpen = null; aptNote = null; csWeek = null; csDay = null; csOpen = null; csCedit = null; refreshRoom(); S.fly = null; flightRes(false); setMode('city'); S.ringIn = S.t; applyFov(); room.setDoor(0); const b = $('#cityBox'); b.classList.remove('rvl'); void b.offsetWidth; b.classList.add('rvl'); glitchHud(.2); }
const flyLabel = dir => setText('#flyT', (dir > 0 ? 'APPROACH: ' : 'DEPART: ') + room.def.name);
function onFlightProgress(e, dir) { $('#flyBox').style.opacity = isInsideRoom() ? 0 : ''; flyLabel(dir); $('#flyP').style.width = (e * 100).toFixed(1) + '%'; $('#flyAlt').textContent = 'ALT ' + String(Math.max(0, Math.round(CAM.position.y))).padStart(3, '0') + 'M'; const d = Math.hypot(CAM.position.x - room.box.x, CAM.position.z - room.box.z); $('#flyD').textContent = 'DST ' + String(Math.round(d)).padStart(4, '0') + 'M'; }
function tapHot(k) {
  const h = room.hot.find(x => x.key === k); if (!h) return;
  if (h.run) { h.run(); return; }
  if (h.key === 'decide') { if (APP.ringStop) APP.ringStop(); APP.sfx('pickup'); } else APP.sfx('press');
  openSheet(h.sheet);
  tagEls.forEach(t => { if (t.h.key === k) { t.el.classList.add('hot'); setTimeout(() => t.el.classList.remove('hot'), 600); } });
}
/* The same state change as the Work page. The app shows the toast with Undo, then calls City.update. */
function tapClock() { if (APP.clock().on) APP.act('clock-out'); else APP.clockIn(); }
/* the sheet holds the room's cards, or one of the city's own (quick add, progress, system) on its own */
const GCARD = { add: ['gAdd', 'Quick add', 'SYS.INPUT'], prog: ['gProg', 'Progress', 'SYS.RECORD'], sys: ['gSys', 'System', 'SYS.CONFIG'] };
let gOpen = null;
function openGlobal(k) { if (!GCARD[k]) return; if (!S.sheet || gOpen !== k) APP.sfx('open'); gOpen = k; refreshGlobal(k); openSheet(GCARD[k][0]); if (k === 'add') requestAnimationFrame(() => { const i = $('#gAddI'); if (i) i.focus({ preventScroll: true }); }); }
/* a room's sheet shows one card at a time; tabs switch between them */
const TABS = { apartment: [['cToday', 'TODAY'], ['cWeek', 'WEEK'], ['cNotes', 'NOTES'], ['cCareer', 'CAREER'], ['cDecide', 'DECIDE']], gym: [['cSess', 'SESSION'], ['cSplit', 'SPLIT'], ['cBench', 'RACK'], ['cRest', 'REST']], shop: [['cClock', 'CLOCK'], ['cShifts', 'SHIFTS'], ['cPay', 'PAY']], chalet: [['cList', 'LIST'], ['cMeals', 'MEALS'], ['cShakes', 'SHAKES'], ['cCardio', 'CARDIO']], castle: [['cDue', 'DUE'], ['cStudy', 'STUDY'], ['cBoard', 'COURSE'], ['cShelf', 'COURSES']] };
let curCard = null;
function showCard(id) {
  const T = TABS[room.id] || []; if (!T.some(t => t[0] === id)) id = T.length ? T[0][0] : null; curCard = id;
  ROOT.querySelectorAll('#sheet .card[data-r]').forEach(c => c.classList.toggle('cur', c.id === id));
  setHTML('#shTabs', T.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${k === id}" aria-controls="${k}">${l}</button>`).join(''));
  const i = T.findIndex(t => t[0] === id); setText('#shPage', i < 0 ? '' : `${String(i + 1).padStart(2, '0')}/${String(T.length).padStart(2, '0')}`);
  const sc = $('#sheetScroll'); if (sc) sc.scrollTop = 0;
}
function openSheet(id) {
  const c0 = ROOT.getElementById(id), g = c0 && c0.dataset.g, sh0 = $('#sheet'); sh0.classList.toggle('g', !!g); if (!g) gOpen = null;
  ROOT.querySelectorAll('#sheet .card[data-g]').forEach(c => c.classList.toggle('on', c.dataset.g === g));
  setText('#shName', g ? GCARD[g][1] : room.def.sheet[0]); setText('#shPage', g ? GCARD[g][2] : room.def.sheet[1]); sh0.setAttribute('aria-label', g ? GCARD[g][1] : room.def.sheet[0]);
  if (!g) showCard(id);
  refreshRoom(); if (!S.sheet) S.sheetFrom = ROOT.activeElement; S.sheet = true; if (innerWidth < 900) { $('#aptBox').inert = true; $('#gymBox').inert = true; $('#chBox').inert = true; $('#scBox').inert = true; } const s = $('#sheet'); s.classList.add('open'); s.setAttribute('aria-hidden', 'false'); const sc = $('#sheetScroll'); if (sc) sc.scrollTop = 0; scanNow(); $('#btnClose').focus({ preventScroll: true }); }
function closeSheet(quiet) { if (S.sheet && !quiet) APP.sfx(!gOpen && curCard === 'cDecide' ? 'hangup' : 'back'); S.sheet = false; gOpen = null; const s = $('#sheet'); s.classList.remove('open'); s.setAttribute('aria-hidden', 'true'); $('#aptBox').inert = false; $('#gymBox').inert = false; $('#chBox').inert = false; $('#scBox').inert = false; if (!quiet && S.sheetFrom) (S.sheetFrom.isConnected ? S.sheetFrom : $(room.def.panel + ' button')).focus({ preventScroll: true }); S.sheetFrom = null; }
function updateSel() {
  if (!HOME) return;
  const o = ICONS[sel], a = HOME.attrs[o.attr], v = Math.round(pct01(a.bar) * 100);
  $('#dName').textContent = o.d; setRing($('#ringA'), String(v), v / 100); setBar($('#bA'), v / 100); setBar($('#bB'), HOME.into / HOME.need); setBar($('#bC'), HOME.overall);
  $('#vA').textContent = a.val; $('#vB').textContent = 'LV' + a.lvl; $('#vC').textContent = Math.round(HOME.overall * 100) + '%';
  sqInto($('#sqA'), 9, Math.round(v / 100 * 9));
  iconEls.forEach((e, i) => { const on = i === sel; e.el.classList.toggle('hot', on); e.ld.classList.toggle('hot', on); e.dt.classList.toggle('hot', on); });
}

/* Everything the HUD says about his data comes through here, from the app's own functions. */
function refreshHome() {
  HOME = APP.home();
  setText('#brandLv', 'LV ' + HOME.lvl); setText('#btnMe', HOME.initial); setText('#lvL', 'LV ' + HOME.lvl); setText('#lAv', HOME.into + '/' + HOME.need + ' XP'); setText('#vD', String(HOME.into));
  setText('#eqv', HOME.sync);
  $('#lA').style.width = (pct01(HOME.into / HOME.need) * 100).toFixed(1) + '%'; setBar($('#bD'), pct01(HOME.into / HOME.need));
  setHTML('#homeChk', chkHTML(HOME.checks));
  for (const e of iconEls) setText2(e.sm, e.o.r + HOME.attrs[e.o.attr].val);
  updateSel();
}
const setText2 = (el, t) => { if (el.textContent !== t) el.textContent = t; };
function refreshWork() {
  WORK = APP.work();
  const N = WORK, W = shopP ? APP.work(shopP) : N, ratio = pct01(N.pct);
  setText('#shopPer', N.periodEnd); setText('#vE', N.hours);
  setBar($('#bE'), ratio); setRing($('#ringB'), String(Math.round(ratio * 100)), ratio); setRing($('#ringC'), String(Math.round(ratio * 100)), ratio); $('#ringC').querySelector('small').textContent = N.ringSub;
  /* the sheet: the pay period he has stepped to, back through the old ones */
  setText('#shK', W.isNow ? 'Shifts: this period' : W.past ? 'Shifts: an old period' : 'Shifts: a coming period');
  setText('#shPer', W.period); setText('#stH', W.hours); setText('#stN', String(W.worked)); setText('#stG', W.goal);
  setHTML('#shNav', `<div class="seg2 csnav"><button class="rbtn ol" data-pp="${W.prev}" aria-label="The period before">‹</button><button class="rbtn${W.isNow ? '' : ' ol'}" data-pp="">${W.isNow ? 'THIS PERIOD' : 'TO NOW'}</button><button class="rbtn ol" data-pp="${W.next}" aria-label="The period after">›</button></div>`);
  setHTML('#shActs', `<button class="rbtn ol" data-wlast="${W.mon}">COPY LAST WEEK IN</button>`);
  const sd = W.rows.find(r => r.d === shopDay) || W.rows.find(r => r.today) || W.rows[W.rows.length - 1];
  setHTML('#shRows', W.rows.map(r => `<button class="sh ${r.h ? '' : 'off'} ${r.today ? 'today' : ''}${r === sd ? ' sel' : ''}" data-shday="${r.d}" aria-pressed="${r === sd}" aria-label="${r.aria.replace(/ Edit\.$/, '')}"><b>${r.dow}</b><span>${r.day}</span><div class="tr">${r.h ? `<i style="left:${r.left}%;width:${r.width}%"></i>` : ''}</div><em>${r.h ? r.hrs : '-'}</em></button>`).join(''));
  if (sd) shiftInto('#shEd', APP.shift(sd.d));
  setText('#payBig', W.pay); setText('#payEst', W.payEst); setBar($('#bF'), pct01(W.sixBar)); setText('#payAll', W.six); setText('#payWin', !W.isNow ? W.period : W.win ? 'SUBMIT.WIN OPEN' : 'SUBMIT.WIN SHUT');
  setHTML('#payChk', chkHTML(W.checks)); setHTML('#roomChk', chkHTML(N.checks.slice(0, 3)));
  $('#btnFill').hidden = !W.win || !W.isNow; $('#btnLen').hidden = !W.isNow;
  setHTML('#payTr', W.trend.map(x => `<i class="${x.cur ? 'cur' : ''}"><span style="height:${Math.max(2, x.h / W.top * 64).toFixed(1)}px"></span><b>${x.h ? x.hrs : '-'}</b><em>${x.label}</em></i>`).join(''));
  $('#payTr').setAttribute('aria-label', 'Hours in the last six pay periods: ' + W.trend.map(x => `${x.label} ${x.hrs}`).join(', '));
  setText('#vG', N.dayOf + '/' + N.cyc); setBar($('#bG'), N.dayOf / N.cyc);
  paintClock();
}
/* a room's panels read through the app; a throw here must not stop the app's own render */
function refreshRoom() { if (gOpen && S.sheet) try { refreshGlobal(gOpen); } catch (e) { APP.log(e); } if (room.def && room.def.refresh) try { room.def.refresh(); } catch (e) { APP.log(e); } }
let aptDay = null, shopDay = null, aptWeek = null, shopP = null;
/* rows ticked on this visit stay in the list, in the order he found them, so nothing moves under his thumb until he leaves */
const aptKeep = new Set(), aptOrd = new Map();
const rowKey = t => t.id + '|' + t.d;
const aptSort = l => { for (const t of l) if (!aptOrd.has(rowKey(t))) aptOrd.set(rowKey(t), aptOrd.size); return [...l].sort((a, b) => aptOrd.get(rowKey(a)) - aptOrd.get(rowKey(b))); };
/* a task: its tick, its title. In the sheet a tap on the title opens its editor in the row: rename, move, a time, delete */
let aptOpen = null, aptNote = null;
/* the editor: rename; move to today, tomorrow, next week or any date; a time; what it's for; whether it repeats; delete */
const REPS = [['none', 'ONCE'], ['daily', 'DAILY'], ['weekdays', 'WEEKDAYS'], ['weekly', 'WEEKLY']];
const taskEd = t => { const x = APP.task(t.id); if (!x) return ''; return `<div class="ted"><input class="hin" type="text" enterkeyhint="done" autocomplete="off" data-tt="${t.id}" value="${x.title}" aria-label="Rename the task"><div class="tacts"><button class="rbtn ol" data-tw="${t.id}:today">TODAY</button><button class="rbtn ol" data-tw="${t.id}:tomorrow">TOMORROW</button><button class="rbtn ol" data-tw="${t.id}:nextweek">NEXT WEEK</button><label class="tm">ON<input class="hin" type="date" data-tdate="${t.id}" value="${x.date}" aria-label="Move to a date"></label><label class="tm">AT<input class="hin" type="time" data-trem="${t.id}" value="${x.remind}" aria-label="Remind me at"></label></div>
  <div class="tacts" role="group" aria-label="What it's for">${x.cats.map(([k, l, c]) => `<button class="rbtn${x.cat === k ? '' : ' ol'} tcat" style="--k:${c}" data-tcat="${t.id}:${k}" aria-pressed="${x.cat === k}">${l.toUpperCase()}</button>`).join('')}</div>
  <div class="tacts" role="group" aria-label="Repeats">${REPS.map(([k, l]) => `<button class="rbtn${x.rep === k ? '' : ' ol'}" data-trep="${t.id}:${k}" aria-pressed="${x.rep === k}">${l}</button>`).join('')}<button class="rbtn ol dng" data-tdel="${t.id}" style="margin-left:auto">DELETE</button></div></div>`; };
const taskRow = (t, ed) => { const op = ed && aptOpen === rowKey(t); return `<div class="trow${t.done ? ' done' : ''}${op ? ' open' : ''}" style="--c:${t.c}"><button class="tick" data-tick="${t.id}" data-date="${t.d}" aria-label="Mark ${t.done ? 'not done' : 'done'}: ${t.title}"><i></i></button><button class="ttl" data-topen="${t.id}" data-date="${t.d}" aria-expanded="${!!op}"><b>${t.title}</b>${t.meta ? `<small>${t.meta}</small>` : ''}</button>${op ? taskEd(t) : ''}</div>`; };
/* a shift's editor, the same in the apartment's week and the shop */
const shiftEd = x => `<div class="sed" data-sdate="${x.d}"><div class="sedh"><b>SHIFT / ${x.long.toUpperCase()}</b><em>${x.on ? x.h + 'H' : 'NONE'}</em></div><div class="sedg"><label>START<input class="hin" type="time" data-sx="start" value="${x.start}"></label><label>END<input class="hin" type="time" data-sx="end" value="${x.end}"></label><label>BREAK MIN<input class="hin" type="number" inputmode="numeric" min="0" step="5" placeholder="0" data-sx="brk" value="${x.brk}"></label></div>${x.presets.length || x.on ? `<div class="tacts">${x.presets.map(p => `<button class="rbtn ol" data-spre="${p.start}|${p.end}|${p.brk}">${p.label}</button>`).join('')}${x.on ? '<button class="rbtn ol dng" data-sclr="1">CLEAR</button>' : ''}</div>` : ''}</div>`;
/* while he types in a box, leave that box's part of the sheet alone */
const typing = sel => { const a = ROOT.activeElement; return !!(a && a.matches && a.matches('input,textarea') && a.closest(sel)); };
/* a shift editor: redrawn, or while he's in one of its boxes only its hours */
function shiftInto(sel, x) { if (!typing(sel)) return setHTML(sel, shiftEd(x)); const em = ROOT.querySelector(sel + ' .sedh em'); if (em) setText2(em, x.on ? x.h + 'H' : 'NONE'); }
const noneRow = s => `<div class="none">${s}</div>`;
function refreshApt() {
  /* rows are rewritten below: note what had focus, to hand it back */
  const fo = ROOT.activeElement, fk = fo && fo.dataset ? ['day', 'tick', 'topen', 'dec', 'tw', 'nopen', 'npin', 'spre', 'sclr'].find(k => fo.dataset[k]) : null, fv = fk && fo.dataset[fk], fi = fk && fo.dataset.id, zone = fk && fo.closest('#sheet') ? $('#sheet') : hudEl;
  const P = APP.plan(aptWeek), list = aptSort(P.today), open = list.filter(t => !t.done || aptKeep.has(rowKey(t))), n = `${P.done}/${P.today.length}` + (P.overdue ? ` / ${P.overdue} LATE` : '');
  setText('#aptDate', P.date); setText('#aptN', n); setText('#tdN', n);
  setRows('#aptList', open.length ? open.map(t => taskRow(t)).join('') : noneRow(P.today.length ? 'All done today.' : 'Nothing due today.'));
  if (!typing('#tdRows')) setRows('#tdRows', list.length ? list.map(t => taskRow(t, true)).join('') : noneRow('Nothing due today.'));
  /* what slipped past its day: listed, tickable, and all of it onto today in one tap */
  if (!typing('#tdLate')) setHTML('#tdLate', P.late.length ? `<div class="gsec">LATE / ${P.late.length}</div>${P.late.map(t => taskRow(t, true)).join('')}<div class="tacts" style="margin:6px 0 10px"><button class="rbtn" data-late="1">MOVE ${P.late.length} TO TODAY</button></div><div class="gsec">TODAY</div>` : '');
  const day = P.week.find(d => d.d === aptDay) || P.week.find(d => d.today) || P.week[0];
  setText('#wkL', P.weekLabel);
  setHTML('#wkNav', `<div class="seg2 csnav"><button class="rbtn ol" data-aw="-1" aria-label="The week before">‹</button><button class="rbtn${P.isNow ? '' : ' ol'}" data-aw="0">${P.isNow ? 'THIS WEEK' : 'TO NOW'}</button><button class="rbtn ol" data-aw="1" aria-label="The week after">›</button></div>`);
  setHTML('#wkRows', P.week.map(d => `<button class="wk${d.today ? ' today' : ''}${d === day ? ' sel' : ''}" data-day="${d.d}" aria-pressed="${d === day}" aria-label="${d.long}: ${d.left} open"><b>${d.dow}</b><span>${d.day}</span><div>${d.note}</div><em>${d.total ? `${d.total - d.left}/${d.total}` : '-'}</em></button>`).join(''));
  if (!typing('#wkDay')) setRows('#wkDay', day.tasks.length ? aptSort(day.tasks).map(t => taskRow(t, true)).join('') : noneRow(`Nothing on ${day.long}.`));
  setHTML('#wkAdd', `<form class="hadd" data-hadd="${day.d}"><input class="hin" type="text" enterkeyhint="done" autocomplete="off" placeholder="ADD TO ${day.dow}" aria-label="Add a task for ${day.long}"><button class="rbtn" type="submit">ADD</button></form>`);
  shiftInto('#wkShift', APP.shift(day.d));
  setText('#ntN', String(P.noteCount));
  if (aptNote && !P.notes.some(o => o.id === aptNote)) aptNote = null;
  if (!typing('#ntRows')) setHTML('#ntRows', P.notes.length ? P.notes.map(o => { const op = aptNote === o.id, x = op && APP.note(o.id); return `<div class="nrow${op ? ' open' : ''}"><button class="nhit" data-nopen="${o.id}" aria-expanded="${op}"><b>${o.title}</b>${o.body && !op ? `<p>${o.body}</p>` : ''}<small>${o.pin ? 'PINNED / ' : ''}${o.when}</small></button>${x ? `<div class="ned"><textarea class="hin" rows="5" data-nt="${o.id}" aria-label="The note">${x.text}</textarea><div class="tacts"><button class="rbtn ol" data-npin="${o.id}">${x.pin ? 'UNPIN' : 'PIN'}</button><button class="rbtn ol dng" data-ndel="${o.id}">DELETE</button></div></div>` : ''}</div>`; }).join('') : noneRow('Nothing written down yet.'));
  refreshCareer();
  setText('#dcN', String(P.decide.length));
  setHTML('#dcRows', P.decide.length ? P.decide.map(t => `<div class="dcd"><b>${t.title}</b><small>Was due ${t.was}</small><div class="acts"><button class="rbtn" data-dec="rm-done" data-id="${t.id}">DONE</button><button class="rbtn ol" data-dec="rm-later" data-id="${t.id}">+2H</button><button class="rbtn ol" data-dec="rm-tomorrow" data-id="${t.id}">TOMORROW</button></div></div>`).join('') : noneRow('Nothing waiting on you.'));
  const tag = k => tagEls.find(g => g.h.key === k), say = (g, s) => { if (!g) return; const m = g.el.querySelector('small'); setText2(m, s); m.hidden = !s; };
  say(tag('today'), P.today.length ? `${P.done}/${P.today.length}` : ''); say(tag('decide'), P.decide.length ? String(P.decide.length) : '');
  if (fk && !fo.isConnected) { const same = [...zone.querySelectorAll(`[data-${fk}]`)].find(b => b.dataset[fk] === fv && (!fi || b.dataset.id === fi && !b.dataset.dec || b.dataset.id === fi)); const to = same || (S.sheet ? $('#btnClose') : $(room.def.panel + ' button')); if (to) to.focus({ preventScroll: true }); }
}
/* the city's own cards: quick add's preview, progress, system */
const KIND_C = { task: 'var(--hud-cyan)', shift: '#64d2ff', job: 'var(--hud-green)', school: 'var(--hud-green)', wo: '#ff9f0a', city: 'var(--hud-red)' };
function quickPrev() { const i = $('#gAddI'), d = i && APP.quickSay(i.value); setHTML('#gAddP', d ? `<b>${d.title}</b><div class="pills" style="--k:${KIND_C[d.kind] || KIND_C.task}">${d.chips.map(c => `<span>${c}</span>`).join('')}</div>` : '<span>A task, a shift or an application. Dates like "tomorrow" or "fri", #work #gym #school #life, "every mon", "9-5 shift", a course code and "post thu".</span>'); }
function refreshGlobal(k) {
  if (k === 'add') return quickPrev();
  if (k === 'prog') {
    const P = APP.progress(), v = P.need ? P.into / P.need : 0, got = P.trophies.filter(t => t.got).length;
    setText('#gpN', `LV ${P.lvl}`);
    setHTML('#gProgB', `<div class="hero"><div class="ring" id="ringP">${ringHTML(String(P.lvl), v, 'LEVEL')}</div><div><div class="big">${P.xp.toLocaleString('en')}<small> XP</small></div><div class="meta">${(P.need - P.into).toLocaleString('en')} to level ${P.lvl + 1}</div></div></div>
      <div class="stats" style="margin-top:10px">${P.stats.map(([l, n]) => `<div class="stat"><label>${l}</label><b>${n}</b></div>`).join('')}</div>
      <div class="kick" style="margin:12px 0 0">Trophies<span class="mi">${got} OF ${P.trophies.length}</span></div>
      <div class="gtr">${P.trophies.map(t => `<div class="${t.got ? 'got' : ''}"><i></i><span><b>${t.name}</b>${t.hint}</span></div>`).join('')}</div>`);
    return;
  }
  if (k === 'sys') {
    if (typing('#gSys')) return;
    const X = APP.sys(), on = (a, b) => a === b ? '' : ' ol';
    setText('#gsB', 'BUILD ' + X.build);
    const num = (k, l, v, o = '') => `<label>${l}<input class="hin" type="number" inputmode="decimal" data-set="${k}" value="${v}" ${o}></label>`;
    setHTML('#gSysB', `<div class="sgp"><b>YOU</b><div class="sgg"><label class="w">YOUR NAME<input class="hin" type="text" data-set="name" value="${X.name}" autocomplete="off"></label></div></div>
      <div class="sgp"><b>PAY</b><div class="sgg">${num('rate', 'HOURLY RATE (CAD)', X.rate, 'step="0.25" placeholder="HIDE PAY"')}<label>PAID EVERY<select class="hin" data-set="payCycle"><option value="7"${X.payCycle === 7 ? ' selected' : ''}>WEEK</option><option value="14"${X.payCycle === 14 ? ' selected' : ''}>2 WEEKS</option></select></label>
        <label class="w">NEXT (OR LAST) PAYDAY<input class="hin" type="date" data-set="payAnchor" value="${X.payAnchor}"></label>${num('payCutoff', 'HOURS DUE, DAYS BEFORE', X.payCutoff, 'min="0" max="7"')}${num('paySubmitDays', 'SEND TO LEN, DAYS BEFORE', X.paySubmitDays, 'min="0" max="10"')}<label class="w">SUBSCRIPTION HOURS A PERIOD<input class="hin" type="number" inputmode="decimal" step="0.5" min="0" data-set="extraHours" value="${X.extraHours}" placeholder="0"></label></div></div>
      <div class="sgp"><b>GOALS</b><div class="sgg">${num('hoursGoal', 'WEEKLY HOURS', X.hoursGoal, 'placeholder="NONE"')}${num('appGoal', 'WEEKLY APPLICATIONS', X.appGoal, 'placeholder="NONE"')}</div></div>
      <div class="sgp"><b>REMINDERS</b><div class="seg2">${X.push ? '<button class="rbtn ol" data-sact="push-off">TURN OFF</button><button class="rbtn" data-sact="push-test">SEND A TEST</button>' : '<button class="rbtn" data-sact="push-on">TURN ON NOTIFICATIONS</button>'}</div><p>${X.pushSay}</p>
        <div class="seg2" style="margin-top:8px;align-items:center"><button class="rbtn${X.brief ? '' : ' ol'}" data-sact="toggle-brief" aria-pressed="${X.brief}">MORNING RUNDOWN</button><input class="hin" type="time" data-set="remindAt" value="${X.remindAt}" style="width:130px" aria-label="Rundown time"></div>
        <p>Keep reminding until it is done:</p><div class="seg2" style="margin-top:6px">${[[0, 'OFF'], [120, 'EVERY 2H'], [240, 'EVERY 4H']].map(([m, l]) => `<button class="rbtn${on(X.nag, m)}" data-sact="set-nag" data-v="${m}" aria-pressed="${X.nag === m}">${l}</button>`).join('')}</div></div>
      <div class="sgp"><b>SOUND</b><div class="seg2">${[['0', 'OFF'], ['1', 'ON']].map(([v, l]) => `<button class="rbtn${on(X.sound ? '1' : '0', v)}" data-sact="set-sound" data-v="${v}" aria-pressed="${(X.sound ? '1' : '0') === v}">${l}</button>`).join('')}</div><p>This device only. An iPhone's silent switch mutes it.</p>
        <p style="margin-top:12px">Ambience: quiet background for each place, shaped by the weather where you are.</p><div class="seg2" style="margin-top:6px">${[['off', 'OFF'], ['low', 'LOW'], ['medium', 'MEDIUM']].map(([v, l]) => `<button class="rbtn${on(X.amb, v)}" data-sact="set-amb" data-v="${v}" aria-pressed="${X.amb === v}">${l}</button>`).join('')}</div><p>${!X.sound ? 'Plays once Sound is on.' : X.amb !== 'off' && X.perf === 'saver' ? 'Paused while Performance is on Saver.' : 'Dips under every sound and stops when you leave the app.'}</p>
        ${X.own ? `<p style="margin-top:12px">Ring: ${X.own.has ? `your sound, ${X.own.name} (${X.own.secs} s)${X.own.kept ? '' : ', until you reload'}.` : 'the built-in ring. You can use a sound of your own: it stays on this device and is never uploaded.'} It rings when a decision is waiting.</p><div class="seg2" style="margin-top:6px"><input class="vh" id="gRingF" type="file" accept="audio/*,video/*,.mov,.m4a,.mp3,.wav"><label class="rbtn ol" for="gRingF">${X.own.has ? 'CHANGE' : 'USE MY OWN'}</label><button class="rbtn ol" data-sact="ring-test">PLAY</button><button class="rbtn ol" data-sact="ring-stop">STOP</button>${X.own.has ? '<button class="rbtn ol" data-sact="ring-clear">REMOVE</button>' : ''}</div>` : ''}</div>
      <div class="sgp"><b>PERFORMANCE</b><div class="seg2">${[['auto', 'AUTO'], ['smooth', 'SMOOTH'], ['balanced', 'BALANCED'], ['saver', 'SAVER']].map(([v, l]) => `<button class="rbtn${on(X.perf, v)}" data-sact="set-perf" data-v="${v}" aria-pressed="${X.perf === v}">${l}</button>`).join('')}</div><p>${X.perfSay}</p><div class="seg2" style="margin-top:8px;align-items:center"><button class="rbtn ol" data-sact="copy-log">COPY PROBLEM LOG</button><span class="mi">${X.probs} LOGGED</span></div></div>
      <div class="sgp"><b>SYNC</b>${X.sync ? '<div class="seg2"><button class="rbtn" data-sact="sync-now">SYNC NOW</button><button class="rbtn ol" data-sact="sync-off">TURN OFF</button></div>' : '<form class="hadd" id="gSyncF" style="margin-top:0"><input class="hin" id="gSyncI" type="password" autocomplete="off" spellcheck="false" autocapitalize="none" placeholder="SYNC CODE" aria-label="Sync code"><button class="rbtn" type="submit">CONNECT</button></form>'}<p>${X.syncSay}</p></div>
      <div class="sgp"><b>BACKUP</b><div class="seg2"><button class="rbtn ol" data-sact="export">EXPORT BACKUP</button><button class="rbtn ol" data-sact="import">IMPORT BACKUP</button></div><p>Install: iPhone Share, then Add to Home Screen.</p></div>`);
  }
}
/* the apartment's career drawer: applications, their status in one tap, a new one, a remove */
function refreshCareer() {
  const J = APP.jobs(), act = J.list.filter(j => j.status !== 'Rejected').length;
  setText('#crN', `PAUSED / ${act} OPEN`);
  if (typing('#crRows')) return;
  setHTML('#crRows', J.list.length ? J.list.map(j => `<div class="jrow"><div class="jt"><b>${j.company}</b><small>${j.role ? j.role.toUpperCase() + ' / ' : ''}${j.date}</small>${j.link ? `<a href="${j.link}" target="_blank" rel="noopener noreferrer">POSTING</a>` : ''}</div><div class="jst" role="group" aria-label="Status of ${j.company}">${J.statuses.map(([st, c]) => `<button style="--k:${c}" class="${j.status === st ? 'on' : ''}" data-jst="${j.id}|${st}" aria-pressed="${j.status === st}">${st.toUpperCase()}</button>`).join('')}<button data-jdel="${j.id}" aria-label="Remove ${j.company}" style="margin-left:auto">REMOVE</button></div></div>`).join('') : noneRow('No applications. Career is paused.'));
}
/* the gym: today's session on the panel and the whiteboard, the week on the chart, the benchmarks, the rest timer */
const spark = v => { if (v.length < 2) return '<svg viewBox="0 0 72 24" aria-hidden="true"></svg>'; const lo = Math.min(...v), hi = Math.max(...v), r = hi - lo || 1; return `<svg viewBox="0 0 72 24" aria-hidden="true"><polyline fill="none" stroke="#ff4646" stroke-width="1.6" points="${v.map((y, i) => `${(i / (v.length - 1) * 70 + 1).toFixed(1)},${(22 - (y - lo) / r * 20).toFixed(1)}`).join(' ')}"/></svg>`; };
/* the day the gym's sheet shows: today unless he picked another on the split */
let gymDay = null;
/* the chalet: the meals card shows this week's picks, the book by category, or one recipe in full */
let chCat = 'This week', chRecipe = null;
function refreshChalet() {
  const fo = ROOT.activeElement, fk = fo && fo.dataset ? ['fgroc', 'fpick', 'fopen', 'fshake', 'fcat', 'fsnack'].find(k => fo.dataset[k] !== undefined) : null, fv = fk && fo.dataset[fk];
  const F = APP.fuel(), sk = F.shakes.filter(x => x.on).length;
  /* the panel: three bars */
  setText('#chN', F.date); setBar($('#bK1'), sk / F.shakes.length); setText('#vK1', `${sk}/${F.shakes.length}`);
  setBar($('#bK2'), F.all ? F.done / F.all : 0); setText('#vK2', F.all ? `${F.done}/${F.all}` : '-');
  setBar($('#bK3'), Math.min(1, F.cardio.min / F.cardio.goal)); setText('#vK3', String(F.cardio.min));
  /* the list, by aisle, ticked here exactly as on the List tab */
  setText('#flN', F.all ? `${F.done}/${F.all} IN THE CART` : F.book ? 'NOTHING PICKED' : 'OPENING THE BOOK');
  setRows('#flRows', F.list.length ? F.list.map(sec => `<div class="gsec">${sec.sec.toUpperCase()}</div>` + sec.items.map(i => `<button class="git${i.on ? ' on' : ''}" data-fgroc="${i.id}" aria-pressed="${i.on}"><i>✓</i><b>${i.n}</b><em>${i.q}</em></button>`).join('')).join('') : noneRow(F.book ? 'Pick meals in MEALS and what they need shows up here.' : 'Opening the book.'));
  setHTML('#flActs', F.done ? '<button class="rbtn ol" data-fclear="">CLEAR TICKS</button>' : '');
  setHTML('#flSnk', F.snacks.length ? `<b>ADD A SNACK</b>${['Salty', 'Sweet'].map(t => `<div class="gsec">${t.toUpperCase()}</div>` + F.snacks.filter(x => x.t === t).map(x => `<button class="git${x.on ? ' on' : ''}" data-fsnack="${x.n}" aria-pressed="${x.on}"><i>✓</i><b>${x.n}</b><em>${x.p}G</em></button>`).join('')).join('')}` : '');
  /* the meals */
  const R = chRecipe ? APP.recipe(unesc(chRecipe)) : null; if (chRecipe && !R && F.book) chRecipe = null;
  setText('#fmK', R ? 'Recipe' : "This week's meals"); setText('#fmN', `${F.picked.length} PICKED`);
  const cats = ['This week', ...new Set(['All', ...F.cats])];
  if (!cats.includes(chCat)) chCat = 'This week';
  const list = chCat === 'This week' ? F.recipes.filter(r => r.on) : chCat === 'All' ? F.recipes : F.recipes.filter(r => r.c === chCat);
  if (R) setHTML('#fmBody', `<button class="rbtn ol" id="fmBack" data-fback="">‹ ALL MEALS</button>
    <div class="rct">${R.n}</div><div class="rcm">${R.t}</div>
    <div class="acts"><button class="rbtn${R.on ? '' : ' ol'}" data-fpick="${R.n}" aria-pressed="${R.on}">${R.on ? 'ON THIS WEEK ✓' : 'PICK FOR THIS WEEK'}</button></div>
    <div class="mac"><div><b>${R.cal}</b><span>KCAL</span></div><div><b>${R.p}G</b><span>PROTEIN</span></div><div><b>${R.c}G</b><span>CARBS</span></div><div><b>${R.f}G</b><span>FAT</span></div></div>
    <p class="rcm">Makes ${R.sv} portions, macros per portion. ${R.time}. ${R.eq}</p>
    <div class="rch">INGREDIENTS</div>${R.groups.map(g => `${g.g ? `<div class="rcg">${g.g}</div>` : ''}<ul class="rci">${g.i.map(x => `<li>${x}</li>`).join('')}</ul>`).join('')}
    <div class="rch">METHOD</div><ol class="rcs">${R.steps.map(x => `<li><b>${x.h}</b>${x.b}</li>`).join('')}</ol>
    <div class="rch">THE SPARE PORTION</div><p class="rcm">${R.rh}</p>${R.x ? `<p class="rcm">${R.x}</p>` : ''}`);
  else setHTML('#fmBody', !F.book ? noneRow('Opening the book.') : `<div class="seg2 fcats">${cats.map(c => `<button class="rbtn${c === chCat ? '' : ' ol'}" data-fcat="${c}" aria-pressed="${c === chCat}">${c.toUpperCase()}</button>`).join('')}</div>`
    + (list.length ? list.map(r => `<div class="rcr${r.on ? ' on' : ''}"><button class="pk" data-fpick="${r.n}" aria-pressed="${r.on}" aria-label="${r.on ? 'Picked' : 'Pick'} ${r.n} for this week"><i>✓</i></button><button class="op" data-fopen="${r.n}"><div><b>${r.n}</b><small>${r.t}</small></div><em>${r.p}G</em></button></div>`).join('') : noneRow(chCat === 'This week' ? 'Nothing picked yet. Tick meals under ALL.' : 'None here.')));
  /* shakes: today's two, the week as cells */
  setText('#fsN', `${sk}/${F.shakes.length} TODAY`);
  setHTML('#fsBtns', F.shakes.map(x => `<button class="${x.on ? 'on' : ''}" data-fshake="${x.k}" aria-pressed="${x.on}">${x.label.toUpperCase()}<small>${x.on ? 'DONE ✓' : 'TAP WHEN DONE'}</small></button>`).join(''));
  setHTML('#fsWk', F.shakeWeek.map(d => `<i class="${d.n ? 'on' : ''}${d.today ? ' td' : ''}" style="--c:var(--hud-yellow)"><b>${d.dow.slice(0, 2)}</b><span>${d.n || (d.past ? '0' : '-')}</span></i>`).join(''));
  $('#fsWk').setAttribute('aria-label', `This week: ${F.shakeWeek.reduce((a, d) => a + d.n, 0)} shakes`);
  /* cardio: the week against the goal, a log box, the last few */
  setText('#fcN', `${F.cardio.n} THIS WEEK`); setBar($('#bK4'), Math.min(1, F.cardio.min / F.cardio.goal)); setText('#vK4', `${F.cardio.min}/${F.cardio.goal}`);
  setHTML('#fcWk', F.cardio.week.map(d => `<i class="${d.min ? 'on' : ''}${d.today ? ' td' : ''}" style="--c:#ff2e88"><b>${d.dow.slice(0, 2)}</b><span>${d.min || '-'}</span></i>`).join(''));
  $('#fcWk').setAttribute('aria-label', `This week: ${F.cardio.min} of ${F.cardio.goal} minutes`);
  if (!typing('#fcForm')) setHTML('#fcForm', `<b>LOG CARDIO</b><form class="cdf" data-fcardio="1"><div class="seg2">${F.cardio.types.map(t => `<button type="button" class="rbtn${t === F.cardio.type ? '' : ' ol'}" data-ftype="${t}" aria-pressed="${t === F.cardio.type}">${t.toUpperCase()}</button>`).join('')}</div><input class="hin" id="fcType" name="type" maxlength="24" autocapitalize="words" placeholder="SOMETHING ELSE" aria-label="Another kind of cardio"><div class="cdn"><input class="hin" name="min" type="number" inputmode="numeric" min="1" max="600" step="1" placeholder="MINUTES" aria-label="Minutes"><input class="hin" name="dist" type="number" inputmode="decimal" min="0" step="0.1" placeholder="KM" aria-label="Distance in km, if any"><button class="rbtn" type="submit">LOG</button></div></form>`);
  setRows('#fcRows', F.cardio.recent.map(l => `<div class="clg"><b>${l.type} · ${l.min} MIN${l.dist ? ` · ${l.dist} KM` : ''}</b><em>${l.when.toUpperCase()}</em></div>`).join(''));
  /* the tags in the room */
  const tag = k => tagEls.find(g => g.h.key === k), say = (g, t) => { if (!g) return; const m = g.el.querySelector('small'); setText2(m, t); m.hidden = !t; };
  say(tag('fridge'), F.all ? `${F.done}/${F.all}` : ''); say(tag('blender'), `${sk}/${F.shakes.length}`); say(tag('ticket'), `${F.cardio.min} MIN`); say(tag('book'), F.picked.length ? String(F.picked.length) : '');
  /* the fridge list, the cookbook and the ticket in the room follow, repainted only when what they show has changed */
  const sig = chaletSig(F); if (room.id === 'chalet' && room.paint && sig !== CH_SIG) { CH_SIG = sig; room.paint(F); }
  if (fk && !fo.isConnected) { const to = [...ROOT.querySelectorAll(`[data-${fk}]`)].find(b => b.dataset[fk] === fv) || $('#btnClose'); if (to) to.focus({ preventScroll: true }); }
}
/* the castle: School in place. The folder is what's due, the hourglass the study clock and the week's hours, the
   noticeboard this course and the residency, the shelf the course list and the setup */
let csWeek = null, csDay = null, csOpen = null, csCourse = '', csCedit = null;
const csOpts = (X, sel, none = 'NO COURSE') => `<option value="">${none}</option>` + X.courses.map(c => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${c.code || c.name}</option>`).join('');
const csTypes = (X, sel) => X.types.map(t => `<option${t === sel ? ' selected' : ''}>${t}</option>`).join('');
/* setup: stream, track, the weekly goal, the course site. Nothing is pre-filled beyond a 15 h goal he can change */
const csSetup = (X, first) => `<div class="sgp"><b>${first ? 'SET UP SCHOOL' : 'SETUP'}</b>${first ? '<p style="margin:0 0 8px">Four things. Change them any time on the shelf.</p>' : ''}<div class="seg2">${X.streams.map(([k, l]) => `<button class="rbtn${X.stream === k ? '' : ' ol'}" data-csstream="${k}" aria-pressed="${X.stream === k}">${l.toUpperCase()}</button>`).join('')}</div>
  <div class="sgg" style="margin-top:8px"><label>TRACK<select class="hin" data-csx="track">${X.tracks.map(([k, l]) => `<option value="${k}"${X.track === k ? ' selected' : ''}>${l.toUpperCase()}</option>`).join('')}</select></label><label>WEEKLY GOAL (H)<input class="hin" type="number" inputmode="numeric" min="1" max="80" data-csx="goal" value="${X.goal}"></label><label class="w">COURSE SITE<input class="hin" type="url" inputmode="url" data-csx="link" value="${X.linkRaw}" placeholder="HTTPS://"></label></div>
  ${first ? '<div class="acts" style="margin-top:8px"><button class="rbtn" data-csgo="1">START SCHOOL</button></div>' : ''}</div>`;
const csRow = (X, t) => { const op = csOpen === t.id; return `<div class="trow${t.done ? ' done' : ''}${op ? ' open' : ''}" style="--c:${t.late ? 'var(--hud-red)' : 'var(--hud-green)'}"><button class="tick" data-cstick="${t.id}" aria-label="Mark ${t.done ? 'not done' : 'done'}: ${t.title}"><i></i></button><button class="ttl" data-csopen="${t.id}" aria-expanded="${op}"><b>${t.title}</b><small>${[t.course, t.type.toUpperCase(), t.done ? 'DONE' : t.due + ' / ' + t.day].filter(Boolean).join(' / ')}</small></button>${op ? `<div class="ted"><input class="hin" type="text" enterkeyhint="done" autocomplete="off" data-cst="${t.id}:title" value="${t.title}" aria-label="Rename it"><div class="sgg"><label>COURSE<select class="hin" data-cst="${t.id}:course">${csOpts(X, t.courseId)}</select></label><label>TYPE<select class="hin" data-cst="${t.id}:type">${csTypes(X, unesc(t.type))}</select></label><label>DUE<input class="hin" type="date" data-cst="${t.id}:date" value="${t.date}"></label><label>NOTE OR LINK<input class="hin" type="text" autocomplete="off" data-cst="${t.id}:note" value="${t.note}" placeholder="OPTIONAL"></label></div><div class="tacts">${t.link ? `<a class="rbtn ol" href="${t.link}" target="_blank" rel="noopener noreferrer">OPEN LINK</a>` : ''}<button class="rbtn ol dng" data-csdel="${t.id}">DELETE</button></div></div>` : ''}</div>`; };
function refreshCastle() {
  const fo = ROOT.activeElement, fk = fo && fo.dataset ? ['cstick', 'csopen', 'csday', 'cswk', 'cspick', 'csclock', 'csc', 'csrt'].find(k => fo.dataset[k] !== undefined) : null, fv = fk && fo.dataset[fk];
  const X = APP.school(csWeek), T = APP.school(), due = T.over.length + T.week.length;
  /* the panel: the week's hours, what's due, the clock */
  setText('#scN', T.clock.on ? 'STUDYING' : T.set ? `${fh(T.hours)}/${T.goal}H` : 'SET UP');
  setBar($('#bS1'), Math.min(1, T.hours / T.goal)); setText('#vS1', `${fh(T.hours)}/${T.goal}`);
  setBar($('#bS2'), T.over.length ? 1 : Math.min(1, T.week.length / 6)); setText('#vS2', T.over.length ? `${T.over.length} LATE` : String(T.week.length));
  setText('#vS3', T.clock.on ? hms(T.clock.ms) : T.next ? T.next.due : 'NOTHING DUE'); setBar($('#bS3'), T.clock.on ? (T.clock.ms / 36e5) % 1 : 0); $('#scBox').classList.toggle('live', T.clock.on);
  /* DUE: an add box, then overdue, this week, later, done */
  setText('#cdN', T.set ? (T.over.length ? `${T.over.length} LATE / ` : '') + `${T.week.length} THIS WEEK` : 'NOT SET UP');
  const part = (sel, h) => { if (!typing(sel)) setHTML(sel, h); };
  { if (!T.set) { part('#cdAdd', csSetup(T, true)); setHTML('#cdRows', ''); }
    else { part('#cdAdd', `<form class="csadd" data-csadd="1"><input class="hin" name="title" type="text" enterkeyhint="done" autocomplete="off" placeholder="WHAT'S DUE" aria-label="What's due"><div class="sgg"><label>COURSE<select class="hin" name="course">${csOpts(T, T.course ? T.course.id : '')}</select></label><label>TYPE<select class="hin" name="type">${csTypes(T, 'Reading')}</select></label><label>DUE<input class="hin" name="date" type="date" value="${T.days.find(d => d.today) ? T.days.find(d => d.today).d : ''}"></label><label>&nbsp;<button class="rbtn" type="submit">ADD</button></label></div></form>`);
      part('#cdRows', [['OVERDUE', T.over], ['THIS WEEK', T.week], ['LATER', T.later]].filter(([, L]) => L.length).map(([h, L]) => `<div class="gsec">${h} / ${L.length}</div>` + L.map(t => csRow(T, t)).join('')).join('')
      + (!due && !T.later.length ? noneRow('Nothing due. Add it here, or in quick add: one of your course codes, then "post thu".') : '')
      + (T.doneN ? `<div class="gsec">DONE / ${T.doneN}</div>` + T.done.slice(0, 8).map(t => csRow(T, t)).join('') : '')); } }
  /* STUDY: the clock, then the week's hours by day, the picked day's sessions */
  setText('#cyN', `${fh(X.hours)}/${X.goal}H ${X.isNow ? 'THIS WEEK' : X.weekLabel}`);
  setText('#csClk', hms(T.clock.ms)); setText('#csClkS', T.clock.on ? `SINCE ${T.clock.since.toUpperCase()}${T.clock.label ? ' / ' + T.clock.label : ''}` : 'NOT STUDYING');
  const btn = $('#btnStudy'); setText2(btn, T.clock.on ? 'STOP' : 'START'); btn.classList.toggle('ol', false);
  if (!csCourse && T.course && !T.clock.on) csCourse = T.course.id;
  setHTML('#csPick', T.clock.on ? '' : `<div class="seg2">${[['', 'NO COURSE'], ...T.courses.filter(c => !c.past).map(c => [c.id, c.code || c.name])].map(([k, l]) => `<button class="rbtn${csCourse === k ? '' : ' ol'}" data-cspick="${k}" aria-pressed="${csCourse === k}">${l}</button>`).join('')}</div>`);
  setBar($('#bS4'), Math.min(1, X.hours / X.goal)); setText('#vS4', `${fh(X.hours)}/${X.goal}`);
  const day = X.days.find(d => d.d === csDay) || X.days.find(d => d.today) || X.days[0];
  setHTML('#csWk', `<div class="seg2 csnav"><button class="rbtn ol" data-cswk="-1" aria-label="Last week">‹</button><button class="rbtn${X.isNow ? '' : ' ol'}" data-cswk="0">${X.isNow ? 'THIS WEEK' : 'TO NOW'}</button><button class="rbtn ol" data-cswk="1" aria-label="Next week">›</button></div><div class="gwk cswk">${X.days.map(d => `<button class="${d.h ? 'on' : ''}${d.today ? ' td' : ''}${d === day ? ' sel' : ''}" style="--c:var(--hud-green)" data-csday="${d.d}" aria-pressed="${d === day}" aria-label="${d.long}: ${fh(d.h)} hours"><b>${d.dow.slice(0, 2)}</b><span>${d.h ? fh(Math.round(d.h * 10) / 10) : '-'}</span></button>`).join('')}</div>`);
  part('#csSess', `<div class="sedh"><b>${day.long.toUpperCase()}</b><em>${fh(Math.round(day.h * 100) / 100)}H</em></div>` + day.s.map(s => `<div class="sedg css" data-csd="${day.d}" data-csi="${s.i}"><label>START<input class="hin" type="time" data-css="start" value="${s.start}"></label><label>END<input class="hin" type="time" data-css="end" value="${s.end}"></label><label class="cc">COURSE<select class="hin" data-css="course">${csOpts(X, s.course)}</select></label><button class="rbtn ol dng" data-cssdel="1" aria-label="Remove this session">✕</button></div>`).join('') + (day.s.length ? '' : noneRow('No study logged.')));
  part('#csSadd', `<form class="sedg css" data-cssadd="${day.d}"><label>START<input class="hin" type="time" name="start"></label><label>END<input class="hin" type="time" name="end"></label><label class="cc">COURSE<select class="hin" name="course">${csOpts(X, csCourse)}</select></label><button class="rbtn" type="submit">ADD</button></form>`);
  /* COURSE: the noticeboard. This course, up next, the residency */
  setText('#cbN', T.course ? `WEEK ${T.course.n}/${T.course.of}` : T.upNext ? `NEXT ${T.upNext.start}` : 'NO COURSE');
  setHTML('#cbBody', (T.course ? `<div class="hero" style="grid-template-columns:1fr"><div><div class="big">${T.course.code || T.course.name}</div><div class="meta">${T.course.code ? T.course.name : ''}</div></div></div><div class="stats" style="margin-top:8px"><div class="stat"><label>Week</label><b>${T.course.n}/${T.course.of}</b></div><div class="stat"><label>Hours</label><b>${fh(Math.round(T.course.hours * 10) / 10)}</b></div><div class="stat"><label>Ends</label><b>${T.course.end}</b></div></div>${T.course.link ? `<div class="acts"><a class="rbtn ol" href="${T.course.link}" target="_blank" rel="noopener noreferrer">COURSE SITE</a></div>` : ''}` : noneRow(T.courses.length ? 'No course running today.' : 'No courses yet. Add them on the shelf, from your schedule.'))
    + (T.upNext ? `<div class="sgp"><b>UP NEXT</b><p style="margin:0">${T.upNext.code || T.upNext.name}, starts ${T.upNext.start} (${T.upNext.days} days)</p></div>` : '')
    + (T.next ? `<div class="sgp"><b>NEXT DUE</b><p style="margin:0">${T.next.title}, ${T.next.due.toLowerCase()}</p></div>` : ''));
  part('#cbRes', T.res ? `<div class="sgp"><b>RESIDENCY${T.res.say ? ' / ' + T.res.say : ''}</b><div class="sgg"><label>STARTS<input class="hin" type="date" data-csres="start" value="${T.res.start}"></label><label>ENDS<input class="hin" type="date" data-csres="end" value="${T.res.end}"></label></div>
      <div class="gsec">TRAVEL CHECKLIST / ${T.res.list.filter(x => x.done).length}/${T.res.list.length}</div>${T.res.list.map(x => `<div class="git${x.done ? ' on' : ''} csri"><button data-csrt="${x.id}" aria-pressed="${x.done}" aria-label="${x.done ? 'Packed' : 'Not packed'}: ${x.t}"><i>✓</i></button><b>${x.t}</b><button class="rbtn ol dng" data-csrd="${x.id}" aria-label="Remove ${x.t}">✕</button></div>`).join('')}</div>` : '');
  part('#cbResAdd', T.res ? '<form class="hadd" data-csradd="1"><input class="hin" type="text" enterkeyhint="done" autocomplete="off" placeholder="ADD TO THE LIST" aria-label="Add to the travel checklist"><button class="rbtn" type="submit">ADD</button></form>' : '');
  /* COURSES: the shelf. His course list, from his schedule, and the setup */
  setText('#ccN', `${T.courses.length} COURSE${T.courses.length === 1 ? '' : 'S'}`);
  part('#ccRows', (T.courses.length ? T.courses.map(c => csCedit === c.id ? `<div class="sed csce" data-csce="${c.id}"><div class="sgg"><label>CODE<input class="hin" type="text" autocomplete="off" data-csf="code" value="${c.code}"></label><label>NAME<input class="hin" type="text" autocomplete="off" data-csf="name" value="${c.name}"></label><label>STARTS<input class="hin" type="date" data-csf="start" value="${c.start}"></label><label>ENDS<input class="hin" type="date" data-csf="end" value="${c.end}"></label><label class="w">COURSE SITE<input class="hin" type="url" data-csf="link" value="${c.link}" placeholder="HTTPS://"></label></div><div class="tacts"><button class="rbtn" data-csc="${c.id}">DONE</button><button class="rbtn ol dng" data-cscdel="${c.id}">DELETE</button></div></div>`
      : `<button class="git csc${c.now ? ' on' : ''}" data-csc="${c.id}" aria-expanded="false"><i>${c.now ? '●' : ''}</i><b>${c.code || c.name}${c.code && c.name ? ` <small>${c.name}</small>` : ''}</b><em>${c.when}</em></button>`).join('') : noneRow('No courses yet.')));
  part('#ccAdd', `<form class="csadd" data-cscadd="1"><div class="sgg"><label>CODE<input class="hin" name="code" type="text" autocomplete="off" placeholder="COURSE CODE"></label><label>NAME<input class="hin" name="name" type="text" autocomplete="off"></label><label>STARTS<input class="hin" name="start" type="date"></label><label>ENDS<input class="hin" name="end" type="date"></label></div><div class="acts"><button class="rbtn" type="submit">ADD COURSE</button></div></form>`);
  part('#ccSet', csSetup(T, !T.set));
  /* the tags in the room */
  const tag = k => tagEls.find(g => g.h.key === k), say = (g, t) => { if (!g) return; const m = g.el.querySelector('small'); setText2(m, t); m.hidden = !t; };
  say(tag('desk'), T.over.length ? `${T.over.length} LATE` : due ? String(due) : ''); say(tag('glass'), T.clock.on ? 'ON' : `${fh(Math.round(T.hours * 10) / 10)}H`); say(tag('board'), T.course ? `WK ${T.course.n}` : ''); say(tag('shelf'), T.courses.length ? String(T.courses.length) : '');
  /* the folder, the board, the shelf and the screen follow, repainted only when what they show has changed */
  const sig = castleSig(T); if (room.id === 'castle' && room.paint && sig !== CS_SIG) { CS_SIG = sig; room.paint(T); }
  if (fk && !fo.isConnected) { const to = [...ROOT.querySelectorAll(`[data-${fk}]`)].find(b => b.dataset[fk] === fv) || $('#btnClose'); if (to) to.focus({ preventScroll: true }); }
}
/* the study clock counts on the panel and the card, and the sand runs, while he's in the castle */
function ambTick() {
  if (!APP.ambWant) return;
  const inRoom = S.mode === 'room' || (S.mode === 'fly' && S.fly && S.fly.dir > 0), place = inRoom && room.id ? room.id : 'city', w = inRoom ? skyW() : SKY.w;
  APP.ambWant(place, w.snow > .3 ? 'snow' : w.rain >= .75 ? 'downpour' : w.rain > .2 ? 'rain' : 'clear', SKY.wind);
}
setInterval(() => { try { ambTick(); } catch (e) { APP.log(e); } }, 1000);
setInterval(() => { if (room.id !== 'castle' || S.mode === 'city') return; const T = APP.school(); if (!T.clock.on) return; setText('#csClk', hms(T.clock.ms)); setText('#vS3', hms(T.clock.ms)); if (room.sand && (S.sandT = (S.sandT || 0) + 1) % 3 === 0) room.sand(T); }, 1000);
function castleInit() {
  $('#btnScSheet').addEventListener('click', () => openSheet('cDue'));
  $('#btnStudy').addEventListener('click', () => { if (APP.school().clock.on) APP.schoolDo('stop'); else APP.schoolDo('start', csCourse); });
  hudEl.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-cstick],[data-csopen],[data-csdel],[data-cswk],[data-csday],[data-cspick],[data-cssdel],[data-csstream],[data-csgo],[data-csrt],[data-csrd],[data-csc],[data-cscdel]'); if (!b) return; const d = b.dataset;
    if (d.cstick) { APP.schoolDo('taskTick', d.cstick); kick = 1; return; }
    if (d.csopen) { csOpen = csOpen === d.csopen ? null : d.csopen; refreshCastle(); if (csOpen) requestAnimationFrame(() => { const el = ROOT.querySelector(`[data-cst="${csOpen}:title"]`); if (el) el.focus({ preventScroll: false }); }); return; }
    if (d.csdel) { csOpen = null; APP.schoolDo('taskDel', d.csdel); return; }
    if (d.cswk !== undefined) { const v = +d.cswk, m = csWeek ? new Date(csWeek + 'T12:00') : new Date(); m.setDate(m.getDate() + 7 * v); csWeek = v === 0 ? null : `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`; csDay = null; refreshCastle(); return; }
    if (d.csday) { csDay = d.csday; refreshCastle(); return; }
    if (d.cspick !== undefined) { csCourse = d.cspick; refreshCastle(); return; }
    if (d.cssdel) { const r = b.closest('[data-csd]'); if (r) APP.schoolDo('sessDel', r.dataset.csd, +r.dataset.csi); return; }
    if (d.csstream) { APP.schoolDo('setup', { stream: d.csstream }); return; }
    if (d.csgo) { APP.schoolDo('setup', { start: true }); return; }
    if (d.csrt) { APP.schoolDo('resTick', d.csrt); return; }
    if (d.csrd) { APP.schoolDo('resDel', d.csrd); return; }
    if (d.cscdel) { csCedit = null; APP.schoolDo('courseDel', d.cscdel); return; }
    if (d.csc) { csCedit = csCedit === d.csc ? null : d.csc; refreshCastle(); }
  });
  hudEl.addEventListener('change', e => {
    const el = e.target, d = el.dataset || {};
    if (d.cst) { const [id, f] = d.cst.split(':'); return APP.schoolDo('taskSet', id, { [f]: el.value }); }
    if (d.css) { const r = el.closest('[data-csd]'); if (r) APP.schoolDo('sessSet', r.dataset.csd, +r.dataset.csi, { [d.css]: el.value }); return; }
    if (d.csf) { const r = el.closest('[data-csce]'); if (r) APP.schoolDo('courseSet', r.dataset.csce, { [d.csf]: el.value }); return; }
    if (d.csres) return APP.schoolDo('resSet', { [d.csres]: el.value });
    if (d.csx) return APP.schoolDo('setup', { [d.csx]: el.value });
  });
  hudEl.addEventListener('keydown', e => { const el = e.target; if (e.key === 'Enter' && el.dataset && (el.dataset.cst !== undefined || el.dataset.csf !== undefined) && el.tagName === 'INPUT') { e.preventDefault(); el.blur(); } });
  hudEl.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('#cDue,#cStudy,#cBoard,#cShelf')) setTimeout(() => { if (!typing('#sheet') && room.id === 'castle') refreshCastle(); }, 60); });
  hudEl.addEventListener('submit', e => {
    const f = e.target, d = f.dataset || {}; if (!(d.csadd || d.cssadd || d.csradd || d.cscadd)) return; e.preventDefault(); const v = n => f.elements[n] ? f.elements[n].value : '';
    if (d.csadd) { if (APP.schoolDo('taskAdd', { title: v('title'), course: v('course'), type: v('type'), date: v('date') })) { const i = ROOT.querySelector('[data-csadd] [name=title]'); if (i) { i.value = ''; i.focus(); } } else f.elements.title.focus(); return; }
    if (d.cssadd) { if (APP.schoolDo('sessAdd', d.cssadd, { start: v('start'), end: v('end'), course: v('course') })) { const n = ROOT.querySelector('[data-cssadd]'); if (n) { n.elements.start.value = ''; n.elements.end.value = ''; } } else f.elements.start.focus(); return; }
    if (d.csradd) { const i = f.querySelector('input'); if (APP.schoolDo('resAdd', i.value)) { const n = ROOT.querySelector('[data-csradd] input'); if (n) { n.value = ''; n.focus(); } } return; }
    if (d.cscadd) { if (APP.schoolDo('courseAdd', { code: v('code'), name: v('name'), start: v('start'), end: v('end') })) { const n = ROOT.querySelector('[data-cscadd]'); if (n) { n.reset(); n.elements.code.focus(); } } else f.elements.code.focus(); }
  });
}
const gymOpen = new Set();
function refreshGym() {
  /* rows are rewritten below: note what had focus, to hand it back */
  const fo = ROOT.activeElement, fk = fo && fo.dataset ? ['gset', 'gday', 'gdone', 'gex'].find(k => fo.dataset[k] !== undefined) : null, fv = fk && fo.dataset[fk];
  const T = APP.train(), V = gymDay ? APP.train(gymDay) : T;
  const said = X => X.prog ? `${X.prog.done}/${X.prog.total} SETS` : X.s === 'REST' ? 'REST DAY' : X.done ? 'DONE' : 'NOT DONE YET';
  const n = said(T), p = T.prog ? T.prog.p : T.done ? 1 : 0;
  setText('#gymDate', T.date); setText('#gyN', n); setText('#gyS', T.s === 'REST' ? 'REST' : T.s); setHTML('#gyName', T.name.toUpperCase());
  setBar($('#bY1'), p); setText('#vY1', String(Math.round(p * 100)));
  setHTML('#gyWk', T.week.map(d => `<i class="${d.done ? 'on' : ''}${d.today ? ' td' : ''}" style="--c:${d.c}"><b>${d.dow.slice(0, 2)}</b><span>${d.s === 'REST' ? 'R' : d.s}</span></i>`).join(''));
  $('#gyWk').setAttribute('aria-label', `This week: ${T.sDone} of ${T.plan} sessions done`);
  /* the session: every set a button, ticked here exactly as on the Training page */
  setText('#ssK', V.isToday ? "Today's session" : `${V.long}'s session`); setText('#ssN', said(V));
  setHTML('#ssHead', `<b style="--c:${V.c}">${V.s}</b><div><strong>${V.name}</strong><small>${V.sub}</small></div>`);
  setRows('#ssRows', V.ex.length ? V.ex.map((e, k) => { const first = !k || V.ex[k - 1].sec !== e.sec, grp = first ? V.ex.filter(x => x.sec === e.sec) : null, gd = grp && grp.reduce((a, x) => a + Math.min(x.done, x.sets), 0), gt = grp && grp.reduce((a, x) => a + x.sets, 0), key = `${V.s}:${e.i}`, open = e.det && gymOpen.has(key);
    const name = `<b>${e.name}</b>${e.reps ? `<small>${e.reps.toUpperCase()}</small>` : ''}`;
    return `${first && e.sec ? `<div class="exh${gd >= gt ? ' done' : ''}" style="--c:${e.warm ? 'var(--hud-text3)' : V.c}">${e.sec.toUpperCase()}<em>${gd}/${gt}</em></div>` : ''}<div class="exr${e.warm ? ' warm' : ''}${e.done >= e.sets ? ' done' : ''}${open ? ' open' : ''}">${e.det ? `<button class="exq" data-gex="${key}" aria-expanded="${!!open}">${name}</button>` : `<div>${name}</div>`}<span>${e.on.map((on, j) => `<button class="st${on ? ' on' : ''}" data-gset="${e.i}:${j}" data-s="${V.s}" aria-pressed="${on}" aria-label="${e.name}, set ${j + 1} of ${e.sets}">${e.sets === 1 ? '✓' : j + 1}</button>`).join('')}</span>${e.det ? `<p class="exd">${e.det}</p>` : ''}</div>`; }).join('') + (V.cardio ? `<p class="exn" style="--c:${V.c}">${V.cardio}</p>` : '') : noneRow(V.s === 'REST' ? 'Rest day. Recover.' : V.s === 'HIIT' ? 'Conditioning: HIIT or a hill climb.' : 'Nothing listed for this day.'));
  setHTML('#ssActs', V.s === 'REST' ? '' : `<button class="rbtn${V.done ? ' ol' : ''}" data-gdone="${V.d}">${V.done ? 'DONE ✓ / UNDO' : 'MARK DONE'}</button>${V.isToday ? '' : '<button class="rbtn ol" data-gday="">BACK TO TODAY</button>'}`);
  /* that day's session can be swapped for another, that day only */
  if (!typing('#ssSwap')) setHTML('#ssSwap', `<b>SWAP ${V.isToday ? 'TODAY' : V.long.toUpperCase()}</b><div class="seg2">${T.opts.map(o => `<button class="rbtn${o.k === V.s ? '' : ' ol'}" data-gpick="${o.k}" data-d="${V.d}" aria-pressed="${o.k === V.s}" aria-label="${o.k === 'REST' ? 'Rest' : o.k}: ${o.name}">${o.k === 'REST' ? 'REST' : o.k}</button>`).join('')}</div><p>This day only. The weekly pattern is on the split.</p>`);
  /* the weekly pattern, the Plan page's split */
  if (!typing('#spTpl')) setHTML('#spTpl', T.tpl.map(t => `<label>${t.dow}<select class="hin" data-gtpl="${t.i}" aria-label="${t.dow} every week">${T.opts.map(o => `<option value="${o.k}"${o.k === t.k ? ' selected' : ''}>${o.k === 'REST' ? 'REST' : `${o.k} / ${o.name.toUpperCase()}`}</option>`).join('')}</select></label>`).join(''));
  /* the week: a day shows its session in the card above */
  setText('#spN', `${T.sDone}/${T.plan} DONE`); setText('#spSt', T.streak ? `${T.streak} WK STREAK` : 'NO STREAK YET');
  setHTML('#spRows', T.week.map(d => `<button class="wk${d.today ? ' today' : ''}${d.d === V.d ? ' sel' : ''}" data-gday="${d.d}" aria-pressed="${d.d === V.d}" aria-label="${d.long}: ${d.name}${d.done ? ', done' : ''}. Show it."><b>${d.dow}</b><span>${d.day}</span><div><i class="cd" style="--c:${d.c}">${d.s === 'REST' ? 'R' : d.s}</i>${d.name}</div><em>${d.done ? '✓' : ''}</em></button>`).join(''));
  /* the benchmarks, each with its own log box */
  setHTML('#bnRows', T.bench.map(b => `<div class="bn"><div><b>${b.label}</b><small>${b.n ? `PB ${b.pb} ${b.unit} / ${b.n} LOGGED` : 'NO LOGS YET'}</small></div>${spark(b.recent)}<em>${b.last ?? '-'}<small>${b.unit}</small></em><form class="bnf" data-gbench="${b.k}"><input type="number" inputmode="numeric" min="1" step="1" placeholder="NEW ${b.unit}" aria-label="Log ${b.label.toLowerCase()} in ${b.unit.toLowerCase()}"><button class="rbtn" type="submit">LOG</button></form></div>`).join(''));
  const tag = k => tagEls.find(g => g.h.key === k), say = (g, s) => { if (!g) return; const m = g.el.querySelector('small'); setText2(m, s); m.hidden = !s; };
  say(tag('board'), T.prog ? `${T.prog.done}/${T.prog.total}` : ''); say(tag('split'), `${T.sDone}/${T.plan}`);
  /* the whiteboard and the chart in the room follow, repainted only when what they show has changed */
  const sig = gymSig(T); if (room.id === 'gym' && room.paint && sig !== GYM_SIG) { GYM_SIG = sig; room.paint(T); }
  restSeen = -1;
  if (fk && !fo.isConnected) { const to = [...ROOT.querySelectorAll(`[data-${fk}]`)].find(b => b.dataset[fk] === fv) || $('#btnClose'); if (to) to.focus({ preventScroll: true }); }
}
/* the rest timer runs in the app; the room only shows it */
let restSeen = -1;
function paintRest() {
  const ms = APP.restLeft(), s = Math.ceil(ms / 1000); if (s === restSeen) return; restSeen = s;
  const f = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  setText('#rsC', f); $('#rsC').classList.toggle('on', ms > 0);
  const t = tagEls.find(g => g.h.key === 'timer'); if (t) { const m = t.el.querySelector('small'); setText2(m, ms ? f : ''); m.hidden = !ms; t.el.classList.toggle('on', ms > 0); }
}
function paintClock() {
  const c = CLOCK = APP.clock(), f = c.on ? hms(c.ms) : '00:00:00';
  setText('#rbC', f); setText('#shC', f);
  const key = (c.on ? 1 : 0) + (c.brk ? 2 : 0);
  const t = tagEls.find(g => g.h.key === 'clock'); if (t) setText2(t.el.querySelector('small'), f);
  if (key === clockSeen) return;
  if (clockSeen !== null) kick = 1;
  clockSeen = key;
  setText('#rbT', !c.on ? 'OFF THE CLOCK' : c.brk ? 'ON BREAK' : 'ON THE CLOCK');
  setText('#btnClock', c.on ? 'CLOCK OUT' : 'CLOCK IN');
  $('#btnBreak').hidden = !c.on; setText('#btnBreak', c.brk ? 'RESUME' : 'BREAK');
  setText('#shS', c.status);
  if (t) { t.el.classList.toggle('on', c.on); setText2(t.el.querySelector('b'), c.on ? 'CLOCK OUT' : 'CLOCK IN'); t.el.setAttribute('aria-label', c.on ? 'Clock out' : 'Clock in'); t.el.querySelector('small').hidden = !c.on; }
  sqInto($('#sqB'), 9, c.on ? 7 : 3);
  const live = $('#icons .live'); if (live) live.hidden = !c.on;
}

let hudFrameN = 0;
function place(el, x, y, op) { el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; if (op !== undefined && el._op !== op) { el.style.opacity = op; el._op = op; el.style.pointerEvents = op ? '' : 'none'; } }
function hudFrame(dt) {
  const t = S.t; hudFrameN++;
  eqStep(dt, t);
  wave($('#eq'), (x, w, h, d) => drawEq(x, w, h, d, t));
  if (S.close) herPose();
  if (S.mode === 'city') {
    const safeTop = (parseFloat(getComputedStyle(hudEl).getPropertyValue('--st')) || 0) + 84;
    const cover = $('#cityBox').getBoundingClientRect();
    const PW = 90, PH = 40, botLimit = (innerWidth < 900 ? cover.top : innerHeight) - PH - 6;
    const pinLift = innerWidth < 900 ? { train: -74, fuel: 88 } : {}; const px = iconEls.map(o => { const p = project(o.a); return { o, ax: p.x, ay: p.y, x: p.x - 12, y: p.y - 58 + (pinLift[o.k] || 0), on: p.on, off: p.x < 4 ? -1 : p.x > innerWidth - 4 ? 1 : 0 }; });
    const boxes = innerWidth >= 900 ? [cover, $('#dataBox').getBoundingClientRect()] : [];
    const bound = p => { p.x = p.off < 0 ? 0 : p.off > 0 ? innerWidth - (p.o.w || PW + 11) : clamp(p.x, 12, innerWidth - PW - 12); p.y = clamp(p.y, safeTop, botLimit); for (const b of boxes) if (p.x + PW > b.left - 6 && p.x < b.right + 6 && p.y + PH > b.top - 6) p.y = b.top - PH - 6; };
    px.forEach(bound);
    /* pins never overlap each other */
    for (let it = 0; it < 5; it++) { for (let i = 0; i < px.length; i++) for (let j = i + 1; j < px.length; j++) { const a = px[i], b = px[j]; if ((a.off || b.off) && a.off !== b.off) continue; const ox = PW + 4 - Math.abs(a.x - b.x), oy = PH + 4 - Math.abs(a.y - b.y); if (ox > 0 && oy > 0) { if (oy < ox || a.off) { const k = (a.y < b.y ? -1 : 1) * oy / 2; a.y += k; b.y -= k; } else { const k = (a.x < b.x ? -1 : 1) * ox / 2; a.x += k; b.x -= k; } } } px.forEach(bound); }
    for (const p of px) {
      place(p.o.el, p.x, p.y, p.on ? 1 : 0); if (p.o.off !== p.off) { p.o.off = p.off; p.o.el.classList.toggle('el', p.off < 0); p.o.el.classList.toggle('er', p.off > 0); p.o.w = p.off ? p.o.el.offsetWidth : 0; }
      const inView = p.on && !p.off && p.ay > safeTop - 30 && p.ay < innerHeight - 4;
      if (inView) { const sx = p.x + 12, sy = p.y + 34; p.o.ld.setAttribute('d', `M${sx.toFixed(1)} ${sy.toFixed(1)}V${Math.max(sy, p.ay - 6).toFixed(1)}L${p.ax.toFixed(1)} ${p.ay.toFixed(1)}`); p.o.dt.setAttribute('x', (p.ax - 2.5).toFixed(1)); p.o.dt.setAttribute('y', (p.ay - 2.5).toFixed(1)); p.o.ld.style.display = p.o.dt.style.display = ''; }
      else p.o.ld.style.display = p.o.dt.style.display = 'none';
    }
    if (hudFrameN % 24 === 0 && innerWidth >= 900) { const cs = $('#cellsA').children; const on = 1 + Math.floor(Math.random() * 4); for (let i = 0; i < cs.length; i++) cs[i].classList.toggle('on', i < on); }
    if (t - selT > 6) { sel = (sel + 1) % ICONS.length; selT = t; updateSel(); }
    if (RIG || hudFrameN % 2 === 0) { wave($('#wvA'), (x, w, h, d) => drawWave(x, w, h, d, t)); if (innerWidth >= 900) { wave($('#wvB'), (x, w, h, d) => drawWave(x, w, h, d, t, '#ff4646', 1.1, 2.2)); $('#cCars').textContent = S.carCount || 0; const ii = info(); $('#cWin').textContent = ii.calls; $('#cT').textContent = ii.fps; } }
    const kIn = sstep(0, .9, t - (S.ringIn || 0)); if (kIn < 1 && !RIG && HOME) { const a = HOME.attrs[ICONS[sel].attr], v = pct01(a.bar); setRing($('#ringA'), String(Math.round(v * 100 * kIn)), v * kIn); setBar($('#bA'), v * kIn); setBar($('#bB'), HOME.into / HOME.need * kIn); setBar($('#bC'), HOME.overall * kIn); }
    const arc = $('#ringA .arc2'); if (arc) arc.setAttribute('transform', `rotate(${(t * 40) % 360} 50 50)`);
  } else if (S.mode === 'room') {
    for (const g of tagEls) {
      const p = project(g.h.p); const r = g.el.getBoundingClientRect(); const w = r.width || 90;
      /* stay on screen and let the box have the bottom */
      const off = p.x < -20 || p.x > innerWidth + 20 || !p.on || S.sheet;
      const X = clamp(p.x - 16, 8, innerWidth - w - 8), Y = p.y - g.line - 30;
      place(g.el, X, Y, off ? 0 : 1);
      const ln = g.el.querySelector('.ln'); if (ln) ln.style.left = clamp(p.x - X, 3, w - 3).toFixed(1) + 'px';
    }
    if (room.id === 'gym' && (RIG || hudFrameN % 6 === 0)) paintRest();
    if (room.id === 'shop') {
    if (hudFrameN % 24 === 0 && innerWidth >= 900) { const cs = $('#cellsB').children; const on = 1 + Math.floor(Math.random() * 4); for (let i = 0; i < cs.length; i++) cs[i].classList.toggle('on', i < on); }
    const kIn = sstep(0, .9, t - (S.ringIn || 0)); if (kIn < 1 && !RIG && WORK) { const v = pct01(WORK.pct); setRing($('#ringB'), String(Math.round(v * 100 * kIn)), v * kIn); setBar($('#bE'), v * kIn); }
    if (innerWidth >= 900 && (RIG || hudFrameN % 2 === 0)) { wave($('#wvE'), (x, w, h, d) => drawWave(x, w, h, d, t, '#ff4646', 1, 4)); $('#roomData').style.opacity = S.sheet ? 0 : 1; }
    paintClock();
    if (RIG || hudFrameN % 2 === 0) { wave($('#wvC'), (x, w, h, d) => drawWave(x, w, h, d, t, CLOCK.on ? '#5ae4ec' : '#ff4646', CLOCK.on ? 1.1 : .6, 1)); if (S.sheet) wave($('#wvD'), (x, w, h, d) => drawWave(x, w, h, d, t, '#ff4646', 1, 3)); }
    const arc = $('#ringB .arc2'); if (arc) arc.setAttribute('transform', `rotate(${(t * 40) % 360} 50 50)`); const arc3 = $('#ringC .arc2'); if (arc3) arc3.setAttribute('transform', `rotate(${(t * 40) % 360} 50 50)`);
    }
  }
  if (!$('#perf').hidden && (S.t - (S.perfT || 0) > .4)) { S.perfT = S.t; const i = info(); $('#pF').textContent = i.fps + (S.idle ? ' IDLE' : ''); $('#pC').textContent = i.calls; $('#pT').textContent = i.tris.toLocaleString('en'); $('#pR').textContent = i.w + 'x' + i.h; $('#pS').textContent = i.scale; $('#pB').textContent = (Q.bloom ? 'ON' : 'OFF') + '/' + (Q.refl ? 'ON' : 'OFF'); }
}

/* ---------- start ---------- */
let started = false, ready = false, looping = false;
async function boot() {
  try {
    /* a reload inside the shop starts back in the city */
    if (history.state && history.state.city) history.replaceState(null, '');
    /* the sky: what came back last time, then ask again; ?sky=dusk,snow shows one by name */
    SKY.over = skyParse(QS.get('sky')); if (!RIG) { skyKept(); skyAsk(); }
    await initGraphics();
    hudInit(); ready = true; refreshHome(); refreshWork(); room.setDoor(0);
    setBoot('Ready', 1);
    const b = $('#boot'); b.style.opacity = 0; setTimeout(() => b.remove(), 520); scanNow();
    { const cb = $('#cityBox'), tg = $('#dTog'); if (innerWidth < 900) cb.classList.add('slim'); tg.addEventListener('click', () => { const sl = cb.classList.toggle('slim'); tg.setAttribute('aria-expanded', sl ? 'false' : 'true'); tg.setAttribute('aria-label', (sl ? 'Show' : 'Hide') + ' district scan'); }); }
    resume();
  } catch (e) { FAIL('Could not start the city: ' + (e && e.message)); APP.fallback(failMsg, e); }
}
function resume() {
  if (S.sizeStale) { S.sizeStale = false; resize(); }
  if (RIG || looping) return;
  looping = true; S.last = performance.now(); requestAnimationFrame(tick);
}
/* index.html calls this at the end of every render(). */
function update() {
  if (ready && host.hidden) S.away = true;
  host.hidden = false;
  if (!started) { started = true; boot(); }
  if (!ready) return;
  /* a room paints today's date, and her spot by the clock. A new day while he watches repaints the room around her as she
     is; back from the Home Screen, she may have moved on */
  if (S.mode === 'room') { const day = room.day && room.day !== new Date().toDateString(), moved = S.away && room.spot && room.spot !== figSpot(); if (day || moved) try { loadRoom(room.id, !S.away); } catch (e) { APP.log(e); } }
  if (!document.hidden) S.away = false;
  refreshWork(); refreshRoom();
  refreshHome(); resume();
}
function rig() {
  /* test scripts only: draws one frame on request, needs ?cityrig */
  const frame = (t) => new Promise(res => requestAnimationFrame(() => { S.t = t === undefined ? S.t : t; TIME.value = S.t; updateCamera(.016); drawScene(S.t); hudFrame(.016); const i = info(); requestAnimationFrame(() => res(i)); }));
  return {
    frame, info, S, Q, ready: () => ready, skip: skipFlight, ads: () => TEX.ads.image.toDataURL('image/jpeg', .82), signs: () => TEX.signs.image.toDataURL('image/jpeg', .85), adsUsed: () => AD_USED,
    pins: () => iconEls.map(o => { const p = project(o.a); return [o.k, Math.round(p.x), Math.round(p.y), p.on]; }),
    city() { setMode('city'); S.fly = null; S.azGoal = S.az = 0; applyFov(); return frame(); },
    fly(u, dir = 1) { makeFlight(dir); setMode('fly'); S.fly.u = u; S.fly.dur = 1e9; applyFov(); return frame(); },
    load(id) { loadRoom(id); return frame(); },
    reload(id) { room.id = null; loadRoom(id); return frame(); },
    mem: () => ({ ...renderer.info.memory, programs: renderer.info.programs.length }),
    clutter(on) { room.clutter.visible = on; if (FIG) FIG.root.visible = on; const gm = buildGlowMesh(on ? room.glows : room.glowsPlain); room.glowMesh.geometry.dispose(); room.glowMesh.geometry = gm.geometry; gm.material.dispose(); room.fx.geometry.setDrawRange(0, on ? Infinity : room.fxPlain); roomLights(); bakeRoom(); return frame(); },
    room(yaw = 0) { setMode('room'); S.fly = null; S.yaw = S.yawGoal = yaw; S.flyK = 1; applyFov(); room.setDoor(0); return frame(); },
    sheet(id) { openSheet(id); return new Promise(r => setTimeout(r, 650)).then(() => frame()); },
    close() { closeSheet(); return new Promise(r => setTimeout(r, 650)).then(() => frame()); },
    cam(p, l, n) { S.mode = 'cam'; S.camP = p; S.camL = l; S.camN = n; applyFov(); return frame(); },
    figure() { return (figP || Promise.resolve()).then(() => !!FIG); },
    hour(h) { HOUR = h; return figSpot(); },
    /* the sky by name ('dusk,snow') or as numbers; null goes back to the real one (in the rig: the painted night) */
    umb: () => city.umb ? city.umb.map(p => p.wet.visible && !p.dry.visible) : null, lampK: () => room.lampK, pq: () => ({ ...PM, weakGpu: WEAK, bloom: Q.bloom, refl: Q.refl, scale: Q.scale, w: renderer.domElement.width }),
    sky(s) { SKY.over = skyParse(s); SKY.next = 0; return frame().then(() => ({ el: SKY.el, L: SKY.L, w: { ...SKY.w } })); },
    sun: sunAt, wx: skyWeather,
    skyNow: () => { const c = v => v.toArray().map(x => +x.toFixed(4)); return { L: SKY.L, key: c(city.u.uMoon.value), keyC: c(city.u.uMoonC.value), hi: c(city.u.uAmbHi.value), fogD: city.u.uFogD.value, pool: city.u.uPoolK.value, sky: c(SKY_U.sky.value), look: c(SKY_U.look.value), lamp: c(SKY_U.lamp.value), rain: city.rain.geometry.instanceCount, rainN: city.rain.userData.n, rainK: c(SKY_U.rainK.value), drops: SKY_U.drops.value, glowK: city.glow.material.uniforms.uGlowK.value, roomHi: c(room.u.uAmbHi.value), roomSky: c(room.u.uSky.value), fig: FIG_DAY.value, light1: c(city.u.uLC.value[1]) }; },
    rest: () => restYaw(), wxShown: () => ({ ...skyW() }), chSig: () => CH_SIG,
    view: () => ({ p: CAM.position.toArray(), d: CAM.getWorldDirection(new THREE.Vector3()).toArray() }),
    figBox() { return FIG ? FIG.keys[FIG.i].box : null; },
    pose(i, go) { if (!FIG) return 0; const n = FIG.nS; if (go) figGo(i % n, S.t); else { FIG.i = i % n; FIG.go = null; FIG_CUT.value = 1e4; } FIG.next = Infinity; return n; },
    /* close up on her: on, and pose i of the close-up set held (null: let them run). Snapped, no easing */
    close(on, i = 0) { closeUp(!!on, true); S.closeK = on ? 1 : 0; applyFov(); if (!FIG) return 0; const n = FIG.keys.length - FIG.nS; if (on && i != null) { FIG.i = FIG.nS + i % n; FIG.go = null; FIG_CUT.value = 1e4; FIG.t1 = S.t; FIG.next = Infinity; } else if (!on) { if (FIG.go) FIG.i = FIG.go.j; FIG.go = null; FIG_CUT.value = 1e4; } return n; },
    /* close up, start the move into close pose j now (held there once it's done) */
    closeGo(j) { if (!FIG) return 0; figGo(FIG.nS + j % (FIG.keys.length - FIG.nS), S.t); FIG.next = Infinity; return FIG.go.dur; },
    tapHer() { const b = FIG && FIG.keys[FIG.i].box; if (!b) return null; const p = project([room.box.x + (b[0][0] + b[1][0]) / 2, room.box.y + (b[0][1] + b[1][1]) / 2, room.box.z + (b[0][2] + b[1][2]) / 2]); return [p.x, p.y]; },
    stats() { return { id: room.id, day: room.day, spot: room.spot, pose: FIG ? FIG.i : null, poses: FIG ? FIG.nS : 0, close: S.close, closeK: S.closeK, spin: Math.round(S.spin * 1e3) / 1e3, spinGoal: Math.round(S.spinGoal * 1e3) / 1e3, herQ: FIG ? FIG.root.quaternion.toArray().map(x => Math.round(x * 1e3) / 1e3) : null, pieces: room.pieces, roomTris: room.tris, clutterTris: room.clutterTris, glow: GLOW.length, worldTris: city.world.geometry.attributes.position.count / 3, farTris: city.far.geometry.attributes.position.count / 3 }; },
  };
}
window.City = {
  update,
  /* Ctrl K and / open the HUD's quick add, from the city or any room */
  quickAdd: () => { if (S.mode === 'fly') return; openGlobal('add'); },
  chip: k => { if (S.mode !== 'city') return null; const e = iconEls.find(i => i.o.attr === k); return e ? e.el : null; },
  _: rig(),
};
update();
