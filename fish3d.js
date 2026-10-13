// 3D fish for the fish guide pages.
// Each fish is shaped from the outline of its wiki picture (fish-shapes.js) and
// wrapped in that picture (fish-tex/). The body archetype below sets its thickness
// and swim style. If a picture can't load, a generated model with painted
// colours and markings is used instead. The crab and crayfish are built by hand.
import * as THREE from './vendor/three.module.min.js';
import SHAPES from './fish-shapes.js';

const L = 2; // body length, snout to tail base
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- archetypes
// H/W: max half-height/half-width. peak: where the body is deepest (0 snout, 1 tail base).
// ped: tail-base depth as a share of H. snout: <1 blunt, >1 pointed. asym: >0 taller back, flatter belly.
// flat: flattened, widened head (catfish, sculpins). Fins: [type, start, end, height].
const ARCH = {
  trout: {H:.2,W:.11,peak:.4,ped:.34,snout:.75,asym:.05,dors:[['soft',.4,.55,.24],['adipose',.78,.83,.07]],anal:[['soft',.7,.8,.17]],tail:['fork',.42,.3,.12],pect:[.2,.2],pelv:[.55,.14],scales:'fine',swim:'sub'},
  salmon: {H:.19,W:.105,peak:.42,ped:.3,snout:.8,asym:.05,dors:[['soft',.4,.54,.23],['adipose',.79,.83,.06]],anal:[['soft',.71,.8,.16]],tail:['fork',.45,.32,.2],pect:[.2,.2],pelv:[.56,.13],scales:'fine',swim:'car'},
  grayling: {H:.18,W:.1,peak:.4,ped:.32,snout:.85,asym:.05,dors:[['sail',.28,.6,.34],['adipose',.79,.83,.06]],anal:[['soft',.7,.8,.15]],tail:['fork',.42,.3,.22],pect:[.2,.19],pelv:[.52,.13],scales:'normal',swim:'sub'},
  whitefish: {H:.18,W:.1,peak:.42,ped:.3,snout:.9,asym:.08,dors:[['soft',.4,.53,.24],['adipose',.79,.83,.06]],anal:[['soft',.72,.8,.15]],tail:['fork',.44,.3,.26],pect:[.2,.18],pelv:[.54,.13],scales:'normal',swim:'sub'},
  smelt: {H:.12,W:.07,peak:.42,ped:.3,snout:1.05,dors:[['soft',.45,.55,.18],['adipose',.8,.84,.05]],anal:[['soft',.68,.82,.12]],tail:['fork',.42,.26,.26],pect:[.2,.14],pelv:[.5,.1],scales:'fine',swim:'car'},
  cyprinid: {H:.2,W:.1,peak:.42,ped:.3,snout:.7,asym:.06,dors:[['soft',.42,.56,.26]],anal:[['soft',.66,.77,.16]],tail:['fork',.42,.32,.22],pect:[.2,.18],pelv:[.47,.14],scales:'normal',swim:'sub'},
  asp: {H:.18,W:.09,peak:.42,ped:.28,snout:.9,asym:.04,dors:[['soft',.44,.56,.26]],anal:[['soft',.64,.8,.15]],tail:['fork',.45,.34,.3],pect:[.2,.18],pelv:[.47,.13],scales:'normal',swim:'car'},
  bream: {H:.36,W:.07,peak:.4,ped:.25,snout:.6,asym:.16,dors:[['soft',.43,.55,.27]],anal:[['low',.55,.86,.16]],tail:['fork',.42,.36,.28],pect:[.2,.2],pelv:[.42,.14],scales:'normal',swim:'sub'},
  carp: {H:.27,W:.15,peak:.38,ped:.36,snout:.6,asym:.16,dors:[['falcate',.34,.68,.24]],anal:[['falcate',.7,.79,.17]],tail:['fork',.42,.36,.2],pect:[.2,.2],pelv:[.45,.15],scales:'large',swim:'sub',slow:true,barbels:[['corner',.07,.9,.4],['nasal',.04,.8,.6]]},
  crucian: {H:.33,W:.13,peak:.4,ped:.36,snout:.55,asym:.16,dors:[['falcate',.34,.66,.22]],anal:[['falcate',.7,.79,.16]],tail:['fork',.38,.34,.12],pect:[.2,.2],pelv:[.45,.15],scales:'large',swim:'sub',slow:true},
  grasscarp: {H:.17,W:.12,peak:.4,ped:.38,snout:.55,asym:.04,dors:[['soft',.42,.54,.22]],anal:[['soft',.7,.79,.15]],tail:['fork',.4,.3,.18],pect:[.2,.18],pelv:[.47,.14],scales:'large',swim:'sub',slow:true},
  tench: {H:.24,W:.14,peak:.4,ped:.52,snout:.6,asym:.06,dors:[['round',.42,.55,.2]],anal:[['round',.68,.78,.16]],tail:['trunc',.36,.3,.02],pect:[.2,.18],pelv:[.45,.17],scales:'fine',swim:'bottom',barbels:[['corner',.04,.9,.5]]},
  barbel: {H:.17,W:.11,peak:.42,ped:.33,snout:1,asym:.22,dors:[['falcate',.4,.53,.26]],anal:[['soft',.68,.78,.16]],tail:['fork',.42,.32,.22],pect:[.2,.18],pelv:[.47,.14],scales:'normal',swim:'bottom',barbels:[['corner',.1,.9,.5],['snout',.09,.6,.8]]},
  yellowfish: {H:.22,W:.12,peak:.4,ped:.33,snout:.8,asym:.14,dors:[['falcate',.38,.52,.27]],anal:[['soft',.68,.78,.16]],tail:['fork',.44,.34,.24],pect:[.2,.19],pelv:[.46,.14],scales:'large',swim:'sub',barbels:[['corner',.06,.9,.5]]},
  labeo: {H:.19,W:.1,peak:.42,ped:.32,snout:.7,asym:.14,dors:[['falcate',.35,.56,.27]],anal:[['soft',.68,.78,.15]],tail:['fork',.42,.32,.24],pect:[.2,.18],pelv:[.47,.14],scales:'normal',swim:'bottom',barbels:[['corner',.03,.9,.5]]},
  carpsucker: {H:.26,W:.11,peak:.4,ped:.3,snout:.75,asym:.16,dors:[['falcate',.33,.63,.3]],anal:[['soft',.7,.79,.15]],tail:['fork',.42,.34,.24],pect:[.2,.19],pelv:[.47,.14],scales:'large',swim:'bottom'},
  drum: {H:.26,W:.11,peak:.36,ped:.32,snout:.65,asym:.26,dors:[['spiny',.32,.45,.2],['low',.45,.82,.15]],anal:[['soft',.7,.79,.14]],tail:['round',.36,.28,0],pect:[.2,.2],pelv:[.36,.15],scales:'normal',swim:'sub'},
  catfish: {H:.16,W:.16,peak:.3,ped:.4,snout:.55,asym:-.05,flat:.5,eye:.6,dors:[['soft',.3,.38,.24],['adipose',.72,.8,.06]],anal:[['low',.6,.82,.14]],tail:['fork',.4,.3,.2],pect:[.15,.22],pelv:[.5,.14],scales:'none',swim:'bottom',barbels:[['max',.48,1.2,.3],['nasal',.14,.7,.9],['chin',.2,.3,1.3],['chin2',.17,.6,1.2]]},
  bullcat: {H:.17,W:.16,peak:.3,ped:.45,snout:.55,asym:-.05,flat:.5,eye:.6,dors:[['soft',.3,.38,.22],['adipose',.72,.8,.06]],anal:[['low',.6,.84,.14]],tail:['trunc',.34,.26,.03],pect:[.15,.2],pelv:[.5,.14],scales:'none',swim:'bottom',barbels:[['max',.38,1.2,.3],['nasal',.14,.7,.9],['chin',.2,.3,1.3],['chin2',.17,.6,1.2]]},
  wels: {H:.14,W:.15,peak:.22,ped:.22,snout:.5,tailE:.8,flat:.6,eye:.5,dors:[['soft',.28,.33,.1]],anal:[['low',.42,.99,.12]],tail:['round',.26,.18,0],pect:[.14,.2],pelv:[.42,.1],scales:'none',swim:'wels',barbels:[['max',.75,1.15,.2],['chin',.14,.3,1.3],['chin2',.12,.6,1.2]]},
  clarias: {H:.12,W:.14,peak:.25,ped:.65,snout:.5,flat:.7,eye:.5,dors:[['low',.3,.95,.1]],anal:[['low',.5,.95,.09]],tail:['round',.26,.18,0],pect:[.14,.18],pelv:[.48,.1],scales:'none',swim:'wels',barbels:[['max',.35,1.2,.3],['nasal',.18,.8,.8],['chin',.16,.3,1.3],['chin2',.14,.6,1.2]]},
  eel: {H:.065,W:.055,peak:.3,ped:.45,snout:.8,eye:.7,dors:[['low',.36,1,.05]],anal:[['low',.5,1,.05]],tail:['point',.12,.06,0],pect:[.13,.08],scales:'none',swim:'ang',gill:false},
  burbot: {H:.12,W:.1,peak:.28,ped:.5,snout:.6,flat:.3,dors:[['round',.3,.37,.1],['low',.39,.96,.08]],anal:[['low',.5,.96,.08]],tail:['round',.24,.18,0],pect:[.16,.14],pelv:[.17,.09],scales:'none',swim:'ang',barbels:[['chinmid',.13,0,1.3]]},
  loach: {H:.08,W:.06,peak:.42,ped:.55,snout:.6,eye:.7,dors:[['round',.5,.58,.1]],anal:[['round',.72,.8,.07]],tail:['round',.2,.15,0],pect:[.14,.09],pelv:[.5,.07],scales:'none',swim:'ang',barbels:[['corner',.07,.9,.6],['nasal',.06,.6,.8],['chin',.05,.4,1.2]]},
  pike: {H:.12,W:.09,peak:.5,ped:.5,snout:1.3,flat:.25,dors:[['soft',.72,.86,.18]],anal:[['soft',.74,.88,.15]],tail:['fork',.38,.28,.16],pect:[.17,.15],pelv:[.5,.12],scales:'fine',swim:'ambush'},
  snakehead: {H:.12,W:.1,peak:.4,ped:.6,snout:.7,flat:.2,dors:[['low',.3,.97,.1]],anal:[['low',.52,.97,.09]],tail:['round',.3,.2,0],pect:[.18,.17],pelv:[.3,.1],scales:'normal',swim:'ambush'},
  perch: {H:.2,W:.1,peak:.38,ped:.3,snout:.9,asym:.16,dors:[['spiny',.28,.5,.24],['soft',.52,.68,.18]],anal:[['soft',.68,.78,.14]],tail:['fork',.38,.28,.12],pect:[.2,.17],pelv:[.35,.14],scales:'normal',swim:'sub'},
  zander: {H:.14,W:.085,peak:.4,ped:.3,snout:1,asym:.08,dors:[['spiny',.28,.48,.2],['soft',.5,.7,.16]],anal:[['soft',.7,.8,.13]],tail:['fork',.38,.27,.14],pect:[.2,.15],pelv:[.33,.13],scales:'normal',swim:'ambush',eye:1.2},
  ruffe: {H:.2,W:.1,peak:.38,ped:.3,snout:.7,asym:.14,dors:[['spiny',.28,.55,.22],['soft',.55,.72,.15]],anal:[['soft',.68,.78,.13]],tail:['fork',.36,.26,.08],pect:[.2,.17],pelv:[.35,.13],scales:'normal',swim:'bottom',eye:1.2},
  bass: {H:.2,W:.11,peak:.4,ped:.33,snout:.7,asym:.08,dors:[['spiny',.32,.5,.2],['soft',.5,.7,.2]],anal:[['soft',.68,.8,.16]],tail:['trunc',.38,.3,.08],pect:[.2,.18],pelv:[.38,.15],scales:'normal',swim:'sub'},
  rockbass: {H:.25,W:.11,peak:.4,ped:.35,snout:.65,asym:.08,dors:[['spiny',.3,.52,.2],['soft',.52,.74,.2]],anal:[['round',.62,.8,.18]],tail:['trunc',.34,.3,.06],pect:[.2,.18],pelv:[.38,.15],scales:'normal',swim:'pan'},
  sunfish: {H:.32,W:.07,peak:.42,ped:.38,snout:.55,asym:.04,dors:[['spiny',.32,.55,.18],['round',.55,.76,.2]],anal:[['round',.6,.78,.18]],tail:['trunc',.32,.3,.06],pect:[.2,.22],pelv:[.36,.15],scales:'normal',swim:'pan'},
  crappie: {H:.3,W:.07,peak:.44,ped:.34,snout:.65,asym:.1,dors:[['spiny',.42,.55,.2],['round',.55,.75,.22]],anal:[['round',.5,.78,.24]],tail:['fork',.34,.3,.08],pect:[.2,.2],pelv:[.38,.14],scales:'normal',swim:'pan'},
  tilapia: {H:.26,W:.09,peak:.42,ped:.4,snout:.6,asym:.06,dors:[['spiny',.3,.72,.2],['round',.72,.86,.22]],anal:[['round',.66,.84,.2]],tail:['trunc',.34,.3,.03],pect:[.2,.2],pelv:[.36,.15],scales:'normal',swim:'pan'},
  mullet: {H:.16,W:.12,peak:.42,ped:.32,snout:.55,flat:.2,dors:[['spiny',.36,.44,.15],['soft',.6,.68,.13]],anal:[['soft',.62,.72,.12]],tail:['fork',.42,.32,.25],pect:[.18,.15],pelv:[.4,.12],scales:'large',swim:'car'},
  tigerfish: {H:.18,W:.1,peak:.4,ped:.3,snout:.9,asym:.04,dors:[['soft',.38,.5,.26],['adipose',.78,.83,.06]],anal:[['soft',.68,.8,.15]],tail:['fork',.46,.34,.32],pect:[.2,.18],pelv:[.46,.13],scales:'large',swim:'car'},
  sturgeon: {H:.1,W:.1,peak:.4,ped:.45,snout:1.4,flat:.45,asym:.08,eye:.6,dors:[['soft',.8,.88,.12]],anal:[['soft',.82,.9,.08]],tail:['hetero',.42,.28,0],pect:[.2,.16],pelv:[.65,.09],scales:'none',swim:'bottom',scutes:true,barbels:[['snout',.06,.5,1.4],['snout2',.06,.2,1.4]]},
  sculpin: {H:.12,W:.15,peak:.18,ped:.35,snout:.5,flat:.8,eye:1.1,dors:[['round',.3,.42,.08],['low',.44,.8,.1]],anal:[['low',.5,.8,.08]],tail:['round',.24,.18,0],pect:[.2,.26,'fan'],pelv:[.25,.08],scales:'none',swim:'bottom'},
};

// ------------------------------------------------------------------ species
// c: [back, side, belly]. fin: dorsal/tail colour, low: lower fins. iris: eye colour.
// p: markings, painted in side coordinates (x 0 snout → 1 tail, y 0 back → 1 belly).
const SPECIES = {
  'African Mottled Eel': {a:'eel',c:['#3f3d22','#6b6a3a','#c9c09a'],fin:'#4a4a2a',p:[{k:'mottle',c:'#24220f',n:140,r:[.012,.03],a:.8}]},
  'African Sharptooth Catfish': {a:'clarias',c:['#3d3a36','#6b655c','#d8d2c4'],fin:'#4a453e',p:[{k:'mottle',c:'#2a2722',n:70,r:[.01,.025],a:.5,y:[0,.6]}]},
  'African Tigerfish': {a:'tigerfish',c:['#3c4a52','#c8d0cc','#f0f2ee'],fin:'#d23a2a',low:'#d8462e',tailEdge:'#1a1a1a',p:[{k:'stripes',c:'#1e2224',ys:[.2,.32,.44,.56],w:.022,x:[.2,.98],a:.9}]},
  'Alpine Bullhead': {a:'sculpin',c:['#5a4a36','#8a7656','#d8ccb0'],fin:'#6a5a40',p:[{k:'bars',c:'#33291c',n:4,x:[.3,.92],y:[0,.6],w:.07,a:.7},{k:'mottle',c:'#3a2e20',n:60,r:[.008,.02],a:.6,y:[0,.7]}]},
  'Amur Catfish': {a:'wels',c:['#3f3e2c','#6e6a4a','#d5d0bc'],fin:'#4a4834',p:[{k:'mottle',c:'#2a291c',n:80,r:[.012,.03],a:.55,y:[0,.65]}]},
  'Andalusian Barbel': {a:'barbel',c:['#6b5e3a','#b09a64','#eee2c4'],fin:'#c49a5a',p:[{k:'spots',c:'#3a3020',n:30,r:[.004,.008],y:[.05,.5],a:.7}]},
  'Arctic Char': {a:'trout',c:['#3e5a5a','#8aa0a0','#e5683a'],fin:'#4e6464',low:'#d0503a',p:[{k:'spots',c:'#f0c0a0',n:55,r:[.006,.011],y:[.1,.62]}]},
  'Asp': {a:'asp',c:['#3d5560','#c8d2d6','#f2f4f4'],fin:'#7a8a92',low:'#c08a7a'},
  'Atlantic Salmon': {a:'salmon',c:['#3a5068','#c4ccd4','#f4f4f4'],fin:'#5a6a7a',p:[{k:'spots',c:'#1a1e24',n:40,r:[.005,.01],y:[.05,.42],x:[.1,.7],shape:'x'}]},
  'Ayu Sweetfish': {a:'smelt',c:['#6a7a50','#c8c8a8','#f0ecd8'],fin:'#c8b860',p:[{k:'ear',c:'#e8c040',x:.3,y:.45,rx:.04,ry:.06}]},
  'Black Crappie': {a:'crappie',c:['#3a4a3a','#b8bca8','#e8e8dc'],fin:'#6a7060',p:[{k:'mottle',c:'#1e241c',n:110,r:[.01,.03],a:.75,y:[0,.8]}]},
  'Blue Kurper': {a:'tilapia',c:['#3a5070','#7a90b0','#c8d0d8'],fin:'#4a6080',low:'#4a6080',p:[{k:'bars',c:'#2a3a52',n:6,x:[.25,.85],y:[.05,.75],w:.05,a:.45},{k:'ear',c:'#1a2234',x:.24,y:.4,rx:.025,ry:.04}]},
  'Bluegill': {a:'sunfish',c:['#3a5040','#7a8a5a','#e8a050'],fin:'#4a5a40',p:[{k:'bars',c:'#2a3a28',n:6,x:[.28,.85],y:[.05,.7],w:.05,a:.45},{k:'ear',c:'#101820',x:.24,y:.36,rx:.035,ry:.06}]},
  'Bream': {a:'bream',c:['#4a4a30','#b0a06a','#e0d8b8'],fin:'#5a5040'},
  'Brook Trout': {a:'trout',c:['#2e4a3a','#5a7050','#e8783a'],fin:'#5a6a40',low:'#e0702e',p:[{k:'vermic',c:'#c8d090',n:46,y:[0,.35]},{k:'spots',c:'#e8d060',n:34,r:[.006,.011],y:[.25,.62]},{k:'spots',c:'#d83a2a',n:14,r:[.006,.009],y:[.35,.62],halo:'#5a86d6'}]},
  'Brown Trout': {a:'trout',c:['#5a4a2a','#c0a060','#f0e0b0'],fin:'#9a7a40',p:[{k:'spots',c:'#1e1a12',n:45,r:[.008,.016],y:[.05,.55],halo:'#e8dcb0'},{k:'spots',c:'#c8361e',n:16,r:[.007,.011],y:[.35,.65],halo:'#f0e8d0'}]},
  'Bullhead Catfish': {a:'bullcat',c:['#4a3a26','#7a6040','#e8dcb0'],fin:'#4a3a26',p:[{k:'mottle',c:'#2e2416',n:50,r:[.012,.03],a:.45,y:[0,.6]}]},
  'Burbot': {a:'burbot',c:['#4a4a28','#8a8040','#d8d0a0'],fin:'#5a5530',p:[{k:'mottle',c:'#26260f',n:150,r:[.01,.026],a:.7,y:[0,.75]}]},
  'Canary Kurper': {a:'sunfish',c:['#6a7040','#c8c070','#f0e080'],fin:'#b0a050',p:[{k:'ear',c:'#2a2a1a',x:.24,y:.38,rx:.025,ry:.04},{k:'bars',c:'#5a5a30',n:5,x:[.3,.85],y:[.1,.6],w:.04,a:.3}]},
  'Channel Catfish': {a:'catfish',c:['#4a5560','#9aa6b0','#eef0f0'],fin:'#5a6570',p:[{k:'spots',c:'#1a1e22',n:28,r:[.006,.012],y:[.15,.6],x:[.2,.9]}]},
  'Cherry Salmon': {a:'salmon',c:['#3a4a58','#c8b8c4','#f4f0f0'],fin:'#5a6070',p:[{k:'parr',c:'#5a5a70',n:8,x:[.22,.88],y:.46,w:.05,h:.16,a:.55},{k:'spots',c:'#1a1e24',n:24,r:[.004,.008],y:[.05,.3]}]},
  'Chub': {a:'cyprinid',c:['#3a4a40','#b8b8a0','#f0ece0'],fin:'#5a5a48',low:'#d0704a',scales:'large',H:.18,W:.11,snout:.6},
  'Chum Salmon': {a:'salmon',c:['#3a4a3a','#8a8a60','#e0dcc8'],fin:'#4a5040',p:[{k:'bars',c:'#8a3a6a',n:6,x:[.25,.85],y:[.2,.85],w:.04,a:.7,wobble:.03},{k:'bars',c:'#2e4a30',n:5,x:[.3,.88],y:[.2,.8],w:.03,a:.6,wobble:.03}]},
  'Comizo Barbel': {a:'barbel',c:['#5a5034','#a89466','#e8dcc0'],fin:'#9a8050',snout:1.2},
  'Common Carp': {a:'carp',c:['#4a4024','#b08a40','#f0dca0'],fin:'#8a6a3a',low:'#b0603a'},
  'Common Dace': {a:'cyprinid',c:['#3a4a50','#c8ccd0','#f4f4f0'],fin:'#b8b890',H:.16},
  'Crucian Carp': {a:'crucian',c:['#4a4a28','#b09a40','#e8d8a0'],fin:'#9a7a40'},
  'Cutthroat Trout': {a:'trout',c:['#4a5a3a','#b0a070','#e8d8b0'],fin:'#7a7a50',p:[{k:'spots',c:'#1a1a12',n:70,r:[.005,.01],y:[.05,.6],x:[.3,1]},{k:'patch',c:'#d02a2a',x:.1,y:.82,rx:.06,ry:.04}]},
  'Dolly Varden Trout': {a:'trout',c:['#4a5a50','#9aa090','#e8e0c8'],fin:'#5a6458',low:'#c8604a',p:[{k:'spots',c:'#e07a6a',n:40,r:[.006,.01],y:[.1,.6]}]},
  'European Bullhead': {a:'sculpin',c:['#5a5040','#8a7a5a','#dcd0b8'],fin:'#6a5e48',p:[{k:'bars',c:'#352d20',n:4,x:[.3,.92],y:[0,.6],w:.06,a:.6},{k:'mottle',c:'#3a3224',n:50,r:[.008,.02],a:.5,y:[0,.7]}]},
  'European Eel': {a:'eel',c:['#3a3a24','#6a6a3a','#e0d8a0'],fin:'#4a4a2c'},
  'European Perch': {a:'perch',c:['#3a5030','#a8b060','#f0f0e0'],fin:'#5a6040',low:'#e05a2a',p:[{k:'bars',c:'#24321a',n:6,x:[.25,.88],y:[0,.6],w:.05,a:.75,wobble:.02}],dorsSpot:'#101010'},
  'Feral Koi': {a:'carp',c:['#f4f0ea','#f4f0ea','#f8f6f2'],fin:'#f0e8e0',low:'#f0e0d0',scales:'large',p:[{k:'blotch',c:'#e8641e',n:5,r:[.07,.13],y:[0,.55]},{k:'blotch',c:'#1a1a1a',n:3,r:[.03,.05],y:[0,.4]}]},
  'Freshwater Drum': {a:'drum',c:['#5a6060','#b8bcbc','#f0f0f0'],fin:'#7a8080'},
  'Golden Trout': {a:'trout',c:['#6a7a40','#e8b030','#e05030'],fin:'#d09030',low:'#e06030',p:[{k:'stripes',c:'#e0402a',ys:[.5],w:.06,x:[.15,.98],a:.8},{k:'parr',c:'#6a6a30',n:9,x:[.2,.9],y:.5,w:.035,h:.16,a:.6},{k:'spots',c:'#1a1a12',n:30,r:[.005,.009],y:[0,.3],x:[.5,1]}]},
  'Grass Carp': {a:'grasscarp',c:['#4a5040','#a8a888','#e8e4d0'],fin:'#5a6050'},
  'Grayling': {a:'grayling',c:['#4a5058','#9aa0a8','#e8e8e8'],fin:'#6a3a5a',low:'#8a5a6a',p:[{k:'spots',c:'#1a1a1e',n:20,r:[.005,.009],y:[.2,.5],x:[.15,.45]}]},
  'Green Sunfish': {a:'sunfish',c:['#3a5a3a','#6a8a5a','#e8c060'],fin:'#4a6a40',H:.28,snout:.7,p:[{k:'ear',c:'#101810',x:.24,y:.36,rx:.03,ry:.05},{k:'stripes',c:'#4ab0c0',ys:[.4,.5],w:.01,x:[.04,.2],a:.7}]},
  'Ide': {a:'cyprinid',c:['#3a4a4a','#b8b8a8','#ecece0'],fin:'#9a7a6a',low:'#c86a4a'},
  'Japanese Dace': {a:'cyprinid',c:['#4a4a3a','#c8c8b8','#f0f0e8'],fin:'#9a9a80',low:'#d8603a',H:.17,p:[{k:'stripes',c:'#d84a2a',ys:[.62,.82],w:.03,x:[.15,.95],a:.8},{k:'stripes',c:'#2a2a20',ys:[.42],w:.02,x:[.2,.95],a:.6}]},
  'Japanese Eel': {a:'eel',c:['#2a3a3a','#5a6a60','#e8e8e0'],fin:'#3a4a48'},
  'Japanese Freshwater Crab': {crab:true,c:['#3e3328','#c8762e','#9aa088','#d8913f']},
  'Japanese Smelt': {a:'smelt',c:['#8a9a80','#d0d4c8','#f0f0ec'],fin:'#c8ccc0',p:[{k:'stripes',c:'#e8f0f0',ys:[.48],w:.025,x:[.15,.98],a:.9}]},
  'Kokanee Salmon': {a:'salmon',c:['#7a2a22','#c8302a','#e8d8c8'],fin:'#3a4a3a',low:'#c8402a',p:[{k:'head',c:'#3a5a3a',x:.2}],hump:.06},
  'Lake Trout': {a:'trout',c:['#4a5048','#8a9088','#e8e4d8'],fin:'#5a6058',tail:['fork',.45,.34,.24],p:[{k:'spots',c:'#e8e0c0',n:90,r:[.006,.012],y:[0,.65]}]},
  'Largemouth Bass': {a:'bass',c:['#3a5030','#8aa060','#f0f0d8'],fin:'#5a6a40',snout:.6,p:[{k:'stripes',c:'#22301a',ys:[.47],w:.07,x:[.15,.98],a:.75,wobble:.02}]},
  'Largemouth Yellowfish': {a:'yellowfish',c:['#5a5a2a','#b8a040','#e8dca0'],fin:'#a08040',snout:.7},
  'Magoi': {a:'carp',c:['#2a2a1e','#5a5236','#a89a70'],fin:'#3a3628',low:'#4a4230'},
  'Mirror Carp': {a:'carp',c:['#4a4024','#a88a40','#f0dca0'],fin:'#8a6a3a',low:'#b0603a',scales:'mirror'},
  'Moggel': {a:'labeo',c:['#5a5248','#a89a88','#e0d8cc'],fin:'#6a6058'},
  'Mountain Whitefish': {a:'whitefish',c:['#4a5a5a','#c8d0d0','#f0f4f4'],fin:'#8a9494'},
  'Mozambique Tilapia': {a:'tilapia',c:['#3a3a3a','#6a6a5a','#c0c0b0'],fin:'#4a4a44',tailEdge:'#b03a2a',H:.24,p:[{k:'bars',c:'#2a2a24',n:5,x:[.3,.85],y:[.1,.7],w:.05,a:.35}]},
  'Northern Pike': {a:'pike',c:['#3a4a24','#6a8040','#f0ecd8'],fin:'#9a6a3a',low:'#b0703a',p:[{k:'spots',c:'#e0d890',n:70,r:[.008,.014],y:[.1,.7],shape:'bean'}]},
  'Northern Snakehead': {a:'snakehead',c:['#4a4a34','#8a8460','#d8d0b0'],fin:'#5a5640',p:[{k:'bars',c:'#24220f',n:9,x:[.18,.95],y:[.15,.8],w:.04,a:.75,wobble:.04}]},
  'Ohrid Trout': {a:'trout',c:['#4a5a5a','#b8b8a8','#f0f0e8'],fin:'#6a7070',p:[{k:'spots',c:'#1a1a1a',n:40,r:[.005,.009],y:[.05,.5]},{k:'spots',c:'#c83a2a',n:14,r:[.005,.008],y:[.35,.6]}]},
  'Pond Loach': {a:'loach',c:['#6a5a3a','#a08a5a','#e0d4b0'],fin:'#7a6a4a',p:[{k:'spots',c:'#3a2e1a',n:120,r:[.004,.009],y:[0,.65]}]},
  'Pumpkinseed': {a:'sunfish',c:['#6a7040','#c8a050','#e8902a'],fin:'#7a7040',p:[{k:'spots',c:'#e07a2a',n:50,r:[.008,.014],y:[.1,.7]},{k:'stripes',c:'#4ab0c0',ys:[.42,.52,.62],w:.01,x:[.04,.2],a:.8},{k:'ear',c:'#101010',x:.24,y:.36,rx:.03,ry:.045,c2:'#e0302a'}]},
  'Purple Labeo': {a:'labeo',c:['#5a4a6a','#8a7a9a','#d0c8d8'],fin:'#6a4a7a'},
  'Rainbow Trout': {a:'trout',c:['#4a5a3a','#c0c8b8','#f4f4f0'],fin:'#6a7050',p:[{k:'stripes',c:'#e0708a',ys:[.5],w:.09,x:[.08,1],a:.75},{k:'spots',c:'#1a1a12',n:80,r:[.004,.008],y:[0,.45]}],tailSpots:true},
  'Redbreast Kurper': {a:'tilapia',c:['#4a5a3a','#8a9a6a','#e0502a'],fin:'#5a6a48',p:[{k:'bars',c:'#3a4a2a',n:6,x:[.28,.85],y:[.05,.6],w:.04,a:.35}]},
  'Rednose Labeo': {a:'labeo',c:['#5a5a50','#a8a8a0','#e8e8e0'],fin:'#7a7a70',p:[{k:'head',c:'#d04030',x:.08}]},
  'River Carpsucker': {a:'carpsucker',c:['#6a6a5a','#c8c8b8','#f4f4ec'],fin:'#9a9a8a'},
  'Roach': {a:'cyprinid',c:['#3a4a5a','#c8ccd4','#f4f4f4'],fin:'#8a7a70',low:'#d0503a',iris:'#d0302a'},
  'Rock Bass': {a:'rockbass',c:['#5a4a30','#a08a5a','#d8c8a0'],fin:'#5a4a30',iris:'#d0302a',p:[{k:'spots',c:'#2a2014',n:60,r:[.007,.011],y:[.25,.8]}]},
  'Rudd': {a:'cyprinid',c:['#4a5a3a','#c8b870','#f0e8c8'],fin:'#e03a20',low:'#e03a20',H:.23},
  'Ruffe': {a:'ruffe',c:['#6a6040','#b0a070','#e8e0c0'],fin:'#8a8060',p:[{k:'spots',c:'#2a2618',n:50,r:[.006,.012],y:[0,.6]}]},
  'Sakhalin Taimen': {a:'salmon',c:['#3a4a40','#a0a090','#e8e4dc'],fin:'#5a5a50',low:'#a04030',H:.16,p:[{k:'spots',c:'#1e2420',n:40,r:[.005,.009],y:[.05,.45],shape:'x'}]},
  'Sauger': {a:'zander',c:['#5a5030','#a89060','#e8e0c8'],fin:'#7a7050',p:[{k:'bars',c:'#2e2a18',n:4,x:[.25,.85],y:[0,.55],w:.08,a:.6,wobble:.03}],dorsSpot:'#1a1a12'},
  'Shovelnose Sturgeon': {a:'sturgeon',c:['#8a7a5a','#b8a888','#ece4d4'],fin:'#8a7a5a'},
  'Signal Crayfish': {crayfish:true,c:['#6a6238','#9a7a58','#8e2a1e','#2a2a24']},
  'Smallmouth Bass': {a:'bass',c:['#5a5030','#a89050','#e8dcb0'],fin:'#7a6a40',iris:'#c8302a',p:[{k:'bars',c:'#4a3e1a',n:9,x:[.2,.95],y:[.1,.7],w:.035,a:.55,wobble:.02}]},
  'Smallmouth Yellowfish': {a:'yellowfish',c:['#5a5a3a','#b8a860','#ece4c0'],fin:'#c0a050',snout:.9},
  'Sockeye Salmon': {a:'salmon',c:['#9a2a22','#d0302a','#e0d0c0'],fin:'#4a6a3a',low:'#c8402a',p:[{k:'head',c:'#4a6a3a',x:.2}],hump:.07},
  'Spotted Bass': {a:'bass',c:['#4a5a30','#9aa060','#f0ecd8'],fin:'#6a6a40',p:[{k:'stripes',c:'#2a3418',ys:[.46],w:.06,x:[.15,.98],a:.7,wobble:.03},{k:'spots',c:'#2a3418',n:40,r:[.004,.007],y:[.6,.85]}]},
  'Tench': {a:'tench',c:['#3a4a20','#6a7a30','#c8b860'],fin:'#3a4020',iris:'#d0402a'},
  'Thicklip Mullet': {a:'mullet',c:['#4a5a68','#c0c8d0','#f0f2f4'],fin:'#8a96a0',p:[{k:'stripes',c:'#7a8692',ys:[.3,.42,.54,.66],w:.012,x:[.15,.98],a:.6}]},
  'Thinlip Mullet': {a:'mullet',c:['#56646e','#cad0d6','#f4f6f6'],fin:'#9aa4ac',p:[{k:'stripes',c:'#8a96a0',ys:[.32,.44,.56],w:.01,x:[.15,.98],a:.5}]},
  'Tiger Muskie (Muskellunge)': {a:'pike',c:['#6a6a40','#b8b080','#f0ecd8'],fin:'#9a7a50',p:[{k:'bars',c:'#3a3a20',n:14,x:[.15,.96],y:[.05,.8],w:.025,a:.75,wobble:.05}]},
  'Walleye': {a:'zander',c:['#4a5030','#b0a050','#f0ecd8'],fin:'#7a7040',eye:1.4,iris:'#e8e8d0',p:[{k:'bars',c:'#2e3018',n:5,x:[.25,.85],y:[0,.45],w:.07,a:.45}],tailTip:'#f4f4f0'},
  'Wels Catfish': {a:'wels',c:['#2a3028','#5a6050','#d8d4c8'],fin:'#3a4034',p:[{k:'mottle',c:'#1a1e18',n:90,r:[.012,.035],a:.6,y:[0,.7]},{k:'mottle',c:'#8a9078',n:40,r:[.01,.02],a:.35,y:[.3,.8]}]},
  'White Crappie': {a:'crappie',c:['#4a5a4a','#c8ccc0','#f0f0ec'],fin:'#8a9080',p:[{k:'bars',c:'#5a6a5a',n:8,x:[.28,.9],y:[0,.55],w:.035,a:.6,wobble:.02}]},
  'White Spotted Char': {a:'trout',c:['#3a4a4a','#8a9494','#ece8e0'],fin:'#4a5656',low:'#e0e0d8',p:[{k:'spots',c:'#f4f4f0',n:60,r:[.009,.016],y:[0,.7]}]},
  'Yellow Perch': {a:'perch',c:['#4a5a20','#d8c840','#f4f0d8'],fin:'#8a8a40',low:'#e08a2a',p:[{k:'bars',c:'#3e4818',n:7,x:[.25,.9],y:[0,.65],w:.045,a:.75}]},
  'Zander': {a:'zander',c:['#4a5550','#a8b0a8','#ecece8'],fin:'#6a7470',p:[{k:'bars',c:'#3a4440',n:8,x:[.25,.92],y:[0,.5],w:.04,a:.45}],dorsDots:'#2a2e2c'},
};

const SWIM = {
  sub:    {A:.1,  wl:1.05, f:1.4, e:s=>.08*s+.92*s*s, pect:.25, pf:1.4, bob:.03},
  car:    {A:.085,wl:1.25, f:2.1, e:s=>s*s*s,         pect:.15, pf:1.1, bob:.02},
  ang:    {A:.13, wl:.6,   f:1.05,e:s=>.3+.7*s,       pect:.3,  pf:2,   bob:.02},
  wels:   {A:.1,  wl:.8,   f:.75, e:s=>.15+.85*s*s,   pect:.2,  pf:.8,  bob:.015},
  bottom: {A:.07, wl:1,    f:.7,  e:s=>s*s,           pect:.35, pf:.9,  bob:.012, tilt:-.04},
  pan:    {A:.035,wl:1,    f:1.1, e:s=>s*s,           pect:.8,  pf:2.6, bob:.035},
  ambush: {A:.02, wl:1.1,  f:.5,  e:s=>s*s,           pect:.35, pf:1.6, bob:.015, burst:true},
};

// ------------------------------------------------------------------- helpers
function hash(s){let h=2166136261;for(const ch of s)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t<=0?0:t>=1?1:t*t*(3-2*t);

function resolve(name){
  const sp=SPECIES[name]||{a:'cyprinid',c:['#4a5a50','#a8b0a0','#eeeee4'],fin:'#7a8070'};
  if(sp.crab||sp.crayfish)return sp;
  const a=ARCH[sp.a]||ARCH.cyprinid,o={...a,...sp};
  o.low=sp.low||sp.fin;o.iris=sp.iris||'#d8b04a';o.swimP=SWIM[o.swim];o.eye=o.eye||1;
  return o;
}

// Body profile: half-heights above/below the midline and half-width at t (0 snout, 1 tail base).
function bodyProfile(P){
  const {H,W,peak,ped,snout=.7,tailE=1,asym=0,flat=0,hump=0}=P;
  const n=t=>t<=peak?Math.pow(Math.sin(Math.PI/2*t/peak),snout):ped+(1-ped)*Math.pow(Math.cos(Math.PI/2*(t-peak)/(1-peak)),tailE);
  return t=>{
    const v=n(Math.min(1,Math.max(0,t)));
    let top=H*v*(1+asym),bot=H*v*(1-asym),w=W*v;
    if(hump)top+=hump*Math.exp(-(((t-.32)/.12)**2)); // spawning hump
    if(flat&&t<.4){const k=(1-t/.4)**2;w*=1+flat*k*1.3;top*=1-flat*k*.35;bot*=1-flat*k*.25}
    return {top,bot,w};
  };
}
const tx=t=>L/2-t*L;

// ------------------------------------------------------------------ painting
const SW=512,SH=256;
function paint(P,name){
  const rand=rng(hash(name)),side=document.createElement('canvas');side.width=SW;side.height=SH;
  const g=side.getContext('2d'),[back,mid,belly]=P.c;
  const gr=g.createLinearGradient(0,0,0,SH);
  gr.addColorStop(0,back);gr.addColorStop(.25,back);gr.addColorStop(.48,mid);gr.addColorStop(.7,mid);gr.addColorStop(.9,belly);gr.addColorStop(1,belly);
  g.fillStyle=gr;g.fillRect(0,0,SW,SH);
  const X=x=>x*SW,Y=y=>y*SH,R=r=>r*SW,rr=([a,b])=>lerp(a,b,rand());
  const dot=(x,y,r,c,shape)=>{g.fillStyle=c;g.beginPath();
    if(shape==='bean')g.ellipse(X(x),Y(y),R(r)*1.6,R(r)*.8,0,0,TAU);
    else if(shape==='x'){g.strokeStyle=c;g.lineWidth=R(r)*.6;g.moveTo(X(x)-R(r),Y(y)-R(r));g.lineTo(X(x)+R(r),Y(y)+R(r));g.moveTo(X(x)+R(r),Y(y)-R(r));g.lineTo(X(x)-R(r),Y(y)+R(r));g.stroke();return}
    else g.arc(X(x),Y(y),R(r),0,TAU);g.fill()};
  for(const p of P.p||[]){
    g.globalAlpha=p.a??1;
    const xr=p.x||[.12,1],yr=p.y||[0,1];
    if(p.k==='spots')for(let i=0;i<p.n;i++){const x=rr(xr),y=rr(yr),r=rr(p.r);if(p.halo)dot(x,y,r*1.7,p.halo);dot(x,y,r,p.c,p.shape)}
    else if(p.k==='mottle')for(let i=0;i<p.n;i++){const x=rr(xr),y=rr(yr),r=rr(p.r);g.fillStyle=p.c;g.beginPath();g.ellipse(X(x),Y(y),R(r)*(1+rand()),R(r),rand()*3,0,TAU);g.fill()}
    else if(p.k==='blotch')for(let i=0;i<p.n;i++){const x=rr([.12,.85]),y=rr(yr),r=rr(p.r);g.fillStyle=p.c;g.beginPath();
      for(let j=0;j<=10;j++){const a=j/10*TAU,k=r*(.7+.5*rand());g.lineTo(X(x)+Math.cos(a)*R(k)*1.4,Y(y)+Math.sin(a)*R(k)*2)}g.fill()}
    else if(p.k==='bars')for(let i=0;i<p.n;i++){const x=lerp(xr[0],xr[1],p.n>1?i/(p.n-1):.5);g.fillStyle=p.c;g.beginPath();
      const wb=p.wobble||0;for(let j=0;j<=8;j++){const y=lerp(yr[0],yr[1],j/8),taper=1-.5*(j/8);g.lineTo(X(x+wb*Math.sin(j*1.7+i)-p.w/2*taper),Y(y))}
      for(let j=8;j>=0;j--){const y=lerp(yr[0],yr[1],j/8),taper=1-.5*(j/8);g.lineTo(X(x+wb*Math.sin(j*1.7+i)+p.w/2*taper),Y(y))}g.fill()}
    else if(p.k==='stripes')for(const y of p.ys){g.strokeStyle=p.c;g.lineWidth=Y(p.w);g.lineCap='round';g.beginPath();
      for(let j=0;j<=24;j++){const x=lerp(xr[0],xr[1],j/24);g.lineTo(X(x),Y(y+(p.wobble||0)*Math.sin(j*1.3)))}g.stroke()}
    else if(p.k==='parr')for(let i=0;i<p.n;i++){const x=lerp(xr[0],xr[1],i/(p.n-1));g.fillStyle=p.c;g.beginPath();g.ellipse(X(x),Y(p.y),R(p.w)/1.2,Y(p.h)/2,0,0,TAU);g.fill()}
    else if(p.k==='vermic'){g.strokeStyle=p.c;g.lineWidth=2.4;g.lineCap='round';for(let i=0;i<p.n;i++){let x=rr([.15,.95]),y=rr(yr);g.beginPath();g.moveTo(X(x),Y(y));
      for(let j=0;j<3;j++){x+=(rand()-.5)*.04;y+=(rand()-.5)*.12;g.lineTo(X(x),Y(y))}g.stroke()}}
    else if(p.k==='ear'){g.fillStyle=p.c;g.beginPath();g.ellipse(X(p.x),Y(p.y),R(p.rx),Y(p.ry),0,0,TAU);g.fill();
      if(p.c2){g.fillStyle=p.c2;g.beginPath();g.ellipse(X(p.x+p.rx*.6),Y(p.y),R(p.rx*.45),Y(p.ry*.5),0,0,TAU);g.fill()}}
    else if(p.k==='patch'){g.fillStyle=p.c;g.beginPath();g.ellipse(X(p.x),Y(p.y),R(p.rx),Y(p.ry),0,0,TAU);g.fill()}
    else if(p.k==='head'){const hg=g.createLinearGradient(0,0,X(p.x+.08),0);hg.addColorStop(0,p.c);hg.addColorStop(.75,p.c);hg.addColorStop(1,p.c+'00');g.fillStyle=hg;g.fillRect(0,0,X(p.x+.08),SH)}
  }
  g.globalAlpha=1;
  // Scales, lateral line and gill cover.
  const sc=P.scales;
  if(sc==='normal'||sc==='large'||sc==='fine'){const s=sc==='large'?15:sc==='normal'?10:6,al=sc==='fine'?.07:.13;
    g.lineWidth=1;for(let y=-s;y<SH+s;y+=s*.7)for(let x=X(.2);x<SW;x+=s){const ox=(Math.round(y/(s*.7))%2)*s/2;
      g.strokeStyle=`rgba(0,0,0,${al})`;g.beginPath();g.arc(x+ox,y,s*.62,-.9*Math.PI/2,.9*Math.PI/2);g.stroke();
      g.strokeStyle=`rgba(255,255,255,${al*.6})`;g.beginPath();g.arc(x+ox-1.5,y,s*.6,-.6,.6);g.stroke()}}
  if(sc==='mirror'){for(const [y,n,r] of [[.08,7,.035],[.46,9,.03]])for(let i=0;i<n;i++){const x=.22+i*.075+rand()*.02;
    g.fillStyle='rgba(230,190,90,.55)';g.beginPath();g.ellipse(X(x),Y(y+rand()*.06),R(r),R(r)*.85,0,0,TAU);g.fill();
    g.strokeStyle='rgba(60,40,10,.4)';g.lineWidth=1.5;g.stroke()}}
  if(P.gill!==false){g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=3;g.beginPath();g.moveTo(X(.17),Y(.18));g.quadraticCurveTo(X(.235),Y(.5),X(.17),Y(.88));g.stroke()}
  if(P.scales!=='none'){g.strokeStyle='rgba(0,0,0,.14)';g.lineWidth=1.5;g.beginPath();g.moveTo(X(.2),Y(.3));g.quadraticCurveTo(X(.5),Y(.4),X(1),Y(.47));g.stroke()}
  // Wrap: top half is the +z side (back → belly), bottom half the mirrored -z side.
  const tex=document.createElement('canvas');tex.width=SW;tex.height=SH*2;const t=tex.getContext('2d');
  t.drawImage(side,0,0);t.save();t.translate(0,SH*2);t.scale(1,-1);t.drawImage(side,0,0);t.restore();
  const T=new THREE.CanvasTexture(tex);T.colorSpace=THREE.SRGBColorSpace;T.flipY=false;T.anisotropy=4;return T;
}

// --------------------------------------------------------------- fish model
function finShape(type,t0,t1,h,dir,prof){
  // Outline [t, height] pairs, then mapped onto the back (dir 1) or belly (dir -1).
  const d=t1-t0;let o;
  if(type==='spiny'){o=[[t0,0]];const n=Math.max(5,Math.round(d*40));for(let i=0;i<n;i++){const a=t0+d*i/n;o.push([a+d*.02/n,h*(1-.35*i/n)],[a+d*.6/n,h*.55*(1-.3*i/n)])}o.push([t1,h*.4],[t1,0])}
  else if(type==='sail')o=[[t0,0],[t0+.05*d,h*.8],[t0+.3*d,h],[t1-.12*d,h*.95],[t1,h*.45],[t1,0]];
  else if(type==='adipose')o=[[t0,0],[t0+.3*d,h],[t0+.8*d,h*.9],[t1,0]];
  else if(type==='low')o=[[t0,0],[t0+Math.min(.04,.1*d),h],[t1-Math.min(.03,.05*d),h],[t1,h*.5],[t1,0]];
  else if(type==='round')o=[[t0,0],[t0+.1*d,h*.75],[t0+.35*d,h],[t0+.7*d,h*.95],[t1,h*.4],[t1,0]];
  else if(type==='falcate')o=[[t0,0],[t0+.08*d,h],[t0+.2*d,h*.6],[t0+.5*d,h*.38],[t1,h*.32],[t1,0]];
  else o=[[t0,0],[t0+.2*d,h],[t0+.4*d,h*.85],[t1,h*.3],[t1,0]];
  const edge=t=>{const p=prof(t);return dir>0?p.top-.012:-p.bot+.012};
  const s=new THREE.Shape(),base=[];for(let i=0;i<=8;i++)base.push(t0+d*i/8);
  base.forEach((t,i)=>i?s.lineTo(tx(t),edge(t)):s.moveTo(tx(t),edge(t)));
  for(let i=o.length-1;i>=0;i--){const [t,hh]=o[i];s.lineTo(tx(t),edge(t)+dir*hh)}
  return new THREE.ShapeGeometry(s);
}
function tailShape(P,prof){
  const [type,len,spread,depth]=P.tail,p=prof(1),hp=Math.max(.02,(p.top+p.bot)/2*.9),x0=tx(1)+.02,s=new THREE.Shape();
  s.moveTo(x0,hp);
  if(type==='fork'){s.quadraticCurveTo(x0-len*.5,spread*.9,x0-len,spread);s.quadraticCurveTo(x0-len*(1-depth)-.02,spread*.3,x0-len*(1-depth),0);s.quadraticCurveTo(x0-len*(1-depth)-.02,-spread*.3,x0-len,-spread);s.quadraticCurveTo(x0-len*.5,-spread*.9,x0,-hp)}
  else if(type==='trunc'){s.quadraticCurveTo(x0-len*.5,spread,x0-len,spread);s.quadraticCurveTo(x0-len*(1-depth),0,x0-len,-spread);s.quadraticCurveTo(x0-len*.5,-spread,x0,-hp)}
  else if(type==='round'){s.bezierCurveTo(x0-len*.5,spread*1.1,x0-len*1.05,spread*.8,x0-len,0);s.bezierCurveTo(x0-len*1.05,-spread*.8,x0-len*.5,-spread*1.1,x0,-hp)}
  else if(type==='point'){s.quadraticCurveTo(x0-len*.7,spread,x0-len,0);s.quadraticCurveTo(x0-len*.7,-spread,x0,-hp)}
  else if(type==='hetero'){s.quadraticCurveTo(x0-len*.6,spread*.6,x0-len*1.1,spread*1.1);s.quadraticCurveTo(x0-len*.55,spread*.1,x0-len*.5,-spread*.05);s.quadraticCurveTo(x0-len*.55,-spread*.5,x0-len*.5,-spread*.7);s.quadraticCurveTo(x0-len*.2,-spread*.3,x0,-hp)}
  return new THREE.ShapeGeometry(s,12);
}
function paddle(size,wide){const s=new THREE.Shape(),w=wide?1.6:1;
  s.moveTo(0,.03*size);s.quadraticCurveTo(-.4*size,.32*size*w,-size,.18*size*w);s.quadraticCurveTo(-1.08*size,-.02,-size*.9,-.1*size*w);s.quadraticCurveTo(-.4*size,-.16*size*w,0,-.03*size);
  return new THREE.ShapeGeometry(s,8)}

function buildFish(P,name,swimTo){
  const root=new THREE.Group(),prof=bodyProfile(P),deform=[],attach=[],disposables=[];
  const finMat=c=>{const m=new THREE.MeshStandardMaterial({color:c,side:THREE.DoubleSide,transparent:true,opacity:.86,roughness:.55,metalness:.05});disposables.push(m);return m};
  // Body: rings of ellipses from snout (t=0) to tail base, closed at both ends.
  const N=80,M=32,pos=[],uv=[],idx=[];
  for(let i=0;i<=N;i++){const t=Math.min(1,i/(N-1)),p=prof(t),end=i===N;
    for(let j=0;j<=M;j++){const th=j/M*TAU,c=Math.cos(th),r=end?0:lerp(p.bot,p.top,.5+.5*c);
      pos.push(tx(t),r*c,end?0:p.w*Math.sin(th));uv.push(t,j/M)}}
  for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*(M+1)+j,b=a+M+1;idx.push(a,b,a+1,b,b+1,a+1)}
  const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));bg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));bg.setIndex(idx);bg.computeVertexNormals();
  const tex=paint(P,name),bodyMat=new THREE.MeshStandardMaterial({map:tex,roughness:P.scales==='none'?.35:.42,metalness:P.scales==='none'?.05:.18});
  const body=new THREE.Mesh(bg,bodyMat);root.add(body);deform.push({geo:bg,normals:true});disposables.push(bg,bodyMat,tex);
  // Median fins.
  const addFin=(geo,color)=>{const m=new THREE.Mesh(geo,finMat(color));root.add(m);deform.push({geo});disposables.push(geo)};
  (P.dors||[]).forEach(([ty,a,b,h],i)=>addFin(finShape(ty,a,b,h,1,prof),ty==='adipose'?P.c[0]:i===0&&P.dorsSpot?P.fin:P.fin));
  (P.anal||[]).forEach(([ty,a,b,h])=>addFin(finShape(ty,a,b,h,-1,prof),P.low));
  addFin(tailShape(P,prof),P.tail[0]==='point'?P.fin:P.fin);
  if(P.dorsSpot){const [,a,b,h]=P.dors[0],t=lerp(a,b,.8),p=prof(t),g=new THREE.CircleGeometry(.035,16);g.translate(tx(t),p.top+h*.45,0);
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:P.dorsSpot,side:THREE.DoubleSide}));m.renderOrder=2;root.add(m);deform.push({geo:g});disposables.push(g,m.material)}
  if(P.tailEdge||P.tailTip){const tg=tailShape({...P,tail:[P.tail[0],P.tail[1]*1.02,P.tail[2]*1.02,P.tail[3]]},prof);tg.translate(0,0,-.002);
    const m=new THREE.Mesh(tg,finMat(P.tailEdge||P.tailTip));root.add(m);deform.push({geo:tg});disposables.push(tg)}
  // Paired fins on pivots so they can flap.
  const pair=(t,size,low,splay,droop,color,wide)=>{const p=prof(t);for(const side of[1,-1]){
    const pv=new THREE.Group(),g=paddle(size,wide),m=new THREE.Mesh(g,finMat(color));disposables.push(g);
    pv.add(m);pv.position.set(tx(t),-p.bot*low,side*p.w*(low>.8?.45:.85));pv.rotation.set(0,side*splay,droop);root.add(pv);
    attach.push({obj:pv,x:tx(t),z:pv.position.z,fin:{side,splay}})}};
  if(P.pect)pair(P.pect[0],P.pect[1],.45,.55,-.25,P.low,P.pect[2]==='fan');
  if(P.pelv)pair(P.pelv[0],P.pelv[1],.9,.35,-.75,P.low);
  // Eyes.
  const te=P.flat>.4?.11:.085,pe=prof(te),er=Math.min(.07,Math.max(.022,(pe.top+pe.bot)*.17*P.eye)),th=P.flat>.4?.75:1.0;
  for(const side of[1,-1]){const c=Math.cos(th),s=Math.sin(th),y=pe.top*c,z=side*pe.w*s,n=new THREE.Vector3(0,c/pe.top,side*s/pe.w).normalize();
    const eye=new THREE.Group();eye.position.set(tx(te),y,z);
    const ball=new THREE.Mesh(new THREE.SphereGeometry(er,20,14),new THREE.MeshStandardMaterial({color:P.iris,roughness:.25,metalness:.3}));
    const pupil=new THREE.Mesh(new THREE.SphereGeometry(er*.55,16,12),new THREE.MeshStandardMaterial({color:'#050505',roughness:.05,metalness:.6}));
    ball.scale.set(1,1,.55);ball.lookAt(n);pupil.position.copy(n.clone().multiplyScalar(er*.32));eye.add(ball,pupil);root.add(eye);
    disposables.push(ball.geometry,ball.material,pupil.geometry,pupil.material);attach.push({obj:eye,x:tx(te),z})}
  // Barbels.
  const barbMat=new THREE.MeshStandardMaterial({color:P.c[0],roughness:.6});disposables.push(barbMat);
  for(const [kind,len,out,down] of P.barbels||[]){
    const at={max:[.04,1.9],corner:[.03,2],nasal:[.025,.7],chin:[.06,2.75],chin2:[.07,2.45],snout:[.06,2.75],snout2:[.06,2.95],chinmid:[.06,Math.PI]}[kind];
    for(const side of kind==='chinmid'?[0]:[1,-1]){
      const p=prof(at[0]),thb=at[1],c=Math.cos(thb),y=lerp(p.bot,p.top,.5+.5*c)*c,z=(side||0)*p.w*Math.sin(thb);
      const dir=new THREE.Vector3(-Math.cos(out)*Math.cos(down),-Math.sin(down),(side||0)*Math.sin(out)*Math.cos(down)).normalize(),pts=[];
      for(let i=0;i<=6;i++){const f=i/6;pts.push(dir.clone().multiplyScalar(len*f).add(new THREE.Vector3(0,-.35*len*f*f,0)))}
      const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,Math.max(.004,len*.025),5),pv=new THREE.Group();
      pv.position.set(tx(at[0]),y,z);pv.add(new THREE.Mesh(g,barbMat));root.add(pv);disposables.push(g);attach.push({obj:pv,x:tx(at[0]),z,barbel:side||1})}}
  // Sturgeon bony plates.
  if(P.scutes){const sg=new THREE.ConeGeometry(.018,.04,5),sm=new THREE.MeshStandardMaterial({color:'#d8ccb0',roughness:.5});disposables.push(sg,sm);
    for(let t=.15;t<.78;t+=.045)for(const th of[0,1.25,-1.25,2.1,-2.1]){const p=prof(t),c=Math.cos(th),r=lerp(p.bot,p.top,.5+.5*c),y=r*c,z=p.w*Math.sin(th);
      const m=new THREE.Mesh(sg,sm);m.position.set(tx(t),y,z);m.lookAt(tx(t),y*2,z*2);m.rotateX(Math.PI/2);root.add(m);attach.push({obj:m,x:tx(t),z})}}
  // Keep the base positions so every frame bends from the rest pose.
  for(const d of deform)d.base=d.geo.attributes.position.array.slice();
  const total=L+P.tail[1],sp=P.swimP;let phase=0,burst=0,next=3;
  root.position.x=P.tail[1]/2; // centre the whole fish, tail included
  return {root,disposables,update(time,dt,playing){
    let A=sp.A,f=sp.f*(P.slow?.8:1);
    if(sp.burst){if(time>next){burst=time;next=time+3.5+Math.random()*3}const b=smooth((time-burst)/.12)*(1-smooth((time-burst-.35)/.5));A=lerp(A,.13,b);f=lerp(f,3,b)}
    if(playing)phase+=TAU*f*dt;
    const lat=x=>{const s=(L/2-x)/total;return A*sp.e(Math.max(0,s))*Math.sin(TAU*s/sp.wl-phase)-A*.18*Math.sin(-phase)};
    for(const d of deform){const a=d.geo.attributes.position,arr=a.array,b=d.base;for(let i=0;i<arr.length;i+=3)arr[i+2]=b[i+2]+lat(b[i]);a.needsUpdate=true;if(d.normals)d.geo.computeVertexNormals()}
    for(const at of attach){at.obj.position.z=at.z+lat(at.x);
      if(at.fin)at.obj.rotation.y=at.fin.side*(at.fin.splay+sp.pect*.6*Math.sin(phase*sp.pf/sp.f+(at.fin.side>0?0:Math.PI*.3)));
      if(at.barbel)at.obj.rotation.y=.18*Math.sin(time*1.3+at.x*5)*at.barbel}
    swimTo.position.y=sp.bob*Math.sin(time*.9);swimTo.rotation.z=(sp.tilt||0)+.03*Math.sin(time*.55);swimTo.rotation.y=.07*Math.sin(time*.3);
  }};
}

// ------------------------------------------------------ picture-based model
// S: traced outline in picture pixels (x samples from snout to tail base, top/bottom edges).
// The body is a tube through that outline; a cut-out of the whole picture sits on the
// midline for the fins, tail and barbels. Both use the picture as their texture.
function swimField(P,head,total){
  const sp=P.swimP;let phase=0,burst=0,next=3,A=sp.A,f=sp.f;
  return{lat:x=>{const s=(head-x)/total;return A*sp.e(Math.max(0,s))*Math.sin(TAU*s/sp.wl-phase)-A*.18*Math.sin(-phase)},
    step(time,dt,playing){A=sp.A;f=sp.f*(P.slow?.8:1);
      if(sp.burst){if(time>next){burst=time;next=time+3.5+Math.random()*3}const b=smooth((time-burst)/.12)*(1-smooth((time-burst-.35)/.5));A=lerp(A,.13,b);f=lerp(f,3,b)}
      if(playing)phase+=TAU*f*dt}};
}
function buildTextured(P,S,tex,swimTo){
  const root=new THREE.Group(),W=S.w,H=S.h,k=2.45/W,cx=W/2,cy=H/2,X=px=>(cx-px)*k,Y=py=>(cy-py)*k;
  const ratio=Math.min(1.1,P.W/P.H),n=S.x.length,M=36,pos=[],uv=[],idx=[];
  const ring=(px,top,bot,t)=>{const mid=(top+bot)/2,r=(bot-top)/2;let w=r*ratio;if(P.flat&&t<.4)w*=1+P.flat*(1-t/.4)**2*1.1;
    const ri=Math.max(0,r-Math.min(4,r*.15)); // sample a few pixels inside the outline, clear of the edge
    for(let j=0;j<=M;j++){const th=j/M*TAU,c=Math.cos(th);pos.push(X(px),Y(mid-r*c),w*Math.sin(th)*k);uv.push(px/W,(mid-ri*c)/H)}};
  const m0=(S.t[0]+S.b[0])/2,m1=(S.t[n-1]+S.b[n-1])/2;
  ring(S.x[0]-1,m0,m0,0);
  for(let i=0;i<n;i++)ring(S.x[i],S.t[i],S.b[i],i/(n-1));
  ring(S.x[n-1]+2,m1,m1,1);
  for(let i=0;i<n+1;i++)for(let j=0;j<M;j++){const a=i*(M+1)+j,b=a+M+1;idx.push(a,b,a+1,b,b+1,a+1)}
  const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));bg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));bg.setIndex(idx);bg.computeVertexNormals();
  const look={map:tex,emissiveMap:tex,emissive:new THREE.Color('#ffffff'),emissiveIntensity:.42,roughness:.5,metalness:.05};
  const bodyMat=new THREE.MeshStandardMaterial(look),finMat=new THREE.MeshStandardMaterial({...look,side:THREE.DoubleSide,alphaTest:.45});
  root.add(new THREE.Mesh(bg,bodyMat));
  const pg=new THREE.PlaneGeometry(W*k,H*k,72,1),pa=pg.attributes.position,pu=pg.attributes.uv;
  for(let i=0;i<pa.count;i++){const x=pa.getX(i),y=pa.getY(i);pu.setXY(i,(cx-x/k)/W,(cy-y/k)/H)}
  const plane=new THREE.Mesh(pg,finMat);plane.renderOrder=-1;root.add(plane);
  const deform=[{geo:bg,normals:true},{geo:pg}];for(const d of deform)d.base=d.geo.attributes.position.array.slice();
  const field=swimField(P,X(S.x[0]),(W-S.x[0])*k),sp=P.swimP;
  let bent=false;
  return{root,disposables:[bg,pg,bodyMat,finMat,tex],update(time,dt,playing){field.step(time,dt,playing);
    if(!playing&&bent)return;bent=true;
    for(const d of deform){const a=d.geo.attributes.position,arr=a.array,b=d.base;for(let i=0;i<arr.length;i+=3)arr[i+2]=b[i+2]+field.lat(b[i]);a.needsUpdate=true;if(d.normals)d.geo.computeVertexNormals()}
    swimTo.position.y=sp.bob*Math.sin(time*.9);swimTo.rotation.z=(sp.tilt||0)+.03*Math.sin(time*.55);swimTo.rotation.y=.07*Math.sin(time*.3)}};
}

// ---------------------------------------------------------------- crustaceans
// Built from jointed parts. Limbs are chains of tapered segments that each lie along +x
// from their joint, so a pose is just a rotation per joint (yaw, then pitch).
const V2=(x,y)=>new THREE.Vector2(x,y);
function segGeo(len,r0,r1,flat=1,n=12){ // rounded, tapered segment from x=0 to x=len
  const pts=[V2(0,0)],c0=Math.min(r0,len*.35),c1=Math.min(r1,len*.35);
  for(let i=1;i<=4;i++){const a=i/4*Math.PI/2;pts.push(V2(r0*Math.sin(a),c0*(1-Math.cos(a))))}
  for(let i=1;i<=5;i++){const t=i/6,y=c0+(len-c0-c1)*t;pts.push(V2(lerp(r0,r1,t)*(1+.08*Math.sin(t*Math.PI)),y))}
  for(let i=0;i<=4;i++){const a=i/4*Math.PI/2;pts.push(V2(r1*Math.cos(a),len-c1+c1*Math.sin(a)))}
  pts.push(V2(0,len));
  const g=new THREE.LatheGeometry(pts,n);g.rotateZ(-Math.PI/2);g.scale(1,flat,1);return g;
}
function joint(parent,x,y,z){const j=new THREE.Group();j.rotation.order='YZX';j.position.set(x,y,z);parent.add(j);return j}
// Chain of segments: specs [{len,r0,r1,flat,mat,yaw,pitch,roll}] -> joints (joint i holds segment i).
function chain(parent,at,specs,dis){
  const joints=[];let p=parent,pos=at;
  for(const s of specs){const j=joint(p,...pos);j.rotation.set(s.roll||0,s.yaw||0,s.pitch||0);
    const g=segGeo(s.len,s.r0,s.r1,s.flat||1),m=new THREE.Mesh(g,s.mat);j.add(m);dis.push(g);
    if(s.knob){const k=new THREE.Mesh(new THREE.SphereGeometry(s.r1*1.05,10,8),s.knob);k.position.x=s.len;j.add(k);dis.push(k.geometry)}
    joints.push(j);p=j;pos=[s.len,0,0]}
  for(const j of joints)j.userData.rest=[j.rotation.x,j.rotation.y,j.rotation.z];
  return joints;
}
// Painted shell texture: base colour, darker grooves, speckles; doubles as the bump map.
function shellTex(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');paint(g,w,h,rng(w*7+h));
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
function speckle(g,w,h,rand,n,cols,r0,r1,alpha=.5){for(let i=0;i<n;i++){g.globalAlpha=alpha*rand();g.fillStyle=cols[Math.floor(rand()*cols.length)];g.beginPath();g.arc(rand()*w,rand()*h,r0+rand()*(r1-r0),0,TAU);g.fill()}g.globalAlpha=1}
const shell=(map,extra={})=>new THREE.MeshPhysicalMaterial({map,bumpMap:map,bumpScale:extra.bump??2.5,roughness:extra.rough??.42,metalness:0,clearcoat:.55,clearcoatRoughness:.35,...extra.opts});
const plain=(color,rough=.45)=>new THREE.MeshPhysicalMaterial({color,roughness:rough,clearcoat:.4,clearcoatRoughness:.4});

function buildCrab(){
  const root=new THREE.Group(),dis=[],body=new THREE.Group();root.add(body);
  // Carapace: domed, rounded-square outline, a little wider at the front.
  const Lc=.5,Wc=.62,Hc=.27,N=40,M=72,pos=[],uv=[],idx=[],pos2=[],idx2=[];
  const edge=a=>{const c=Math.cos(a),s=Math.sin(a),e=2/3.2,x=Lc*Math.sign(c)*Math.abs(c)**e;return[x,Wc*(1+.1*x/Lc)*Math.sign(s)*Math.abs(s)**e]};
  for(let i=0;i<=N;i++){const r=i/N;for(let j=0;j<=M;j++){const [ex,ez]=edge(j/M*TAU),x=ex*r,z=ez*r;
    pos.push(x,Hc*Math.pow(Math.max(0,1-r**2.4),.42)+.025*Math.sin(r*Math.PI)*(x>0?1:.4),z);uv.push(x/Lc*.5+.5,z/Wc*.5+.5);
    pos2.push(x,-.09*Math.pow(Math.max(0,1-r**2),.5),z)}}
  for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=i*(M+1)+j,b=a+M+1;idx.push(a,a+1,b,b,a+1,b+1);idx2.push(a,b,a+1,b,b+1,a+1)}
  const geo=(p,ix)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();dis.push(g);return g};
  const topTex=shellTex(512,512,(g,w,h,rand)=>{
    const gr=g.createRadialGradient(w*.55,h/2,10,w/2,h/2,w*.52);gr.addColorStop(0,'#4a3624');gr.addColorStop(.7,'#33251a');gr.addColorStop(.93,'#2a1d14');gr.addColorStop(1,'#6a4c30');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.strokeStyle='#160f0a';g.lineWidth=7;g.lineCap='round';g.globalAlpha=.75; // H-shaped grooves
    g.beginPath();g.moveTo(w*.62,h*.3);g.quadraticCurveTo(w*.5,h*.42,w*.36,h*.36);g.moveTo(w*.62,h*.7);g.quadraticCurveTo(w*.5,h*.58,w*.36,h*.64);g.moveTo(w*.5,h*.42);g.lineTo(w*.5,h*.58);g.stroke();
    g.lineWidth=4;g.beginPath();g.moveTo(w*.75,h*.22);g.quadraticCurveTo(w*.7,h*.12,w*.6,h*.1);g.moveTo(w*.75,h*.78);g.quadraticCurveTo(w*.7,h*.88,w*.6,h*.9);g.stroke();g.globalAlpha=1;
    speckle(g,w,h,rand,2600,['#6b5038','#1a120c','#7d6040'],.8,2.6,.45);speckle(g,w,h,rand,140,['#c9a87a'],1,2.2,.35)});
  const underTex=shellTex(256,256,(g,w,h,rand)=>{g.fillStyle='#8b9183';g.fillRect(0,0,w,h);g.strokeStyle='#5c6258';g.lineWidth=3;for(let i=1;i<6;i++){g.beginPath();g.moveTo(0,h*i/6);g.lineTo(w,h*i/6);g.stroke()}speckle(g,w,h,rand,500,['#b7bcaa','#5c6258'],1,3,.4)});
  const top=new THREE.Mesh(geo(pos,idx),shell(topTex,{bump:3})),under=new THREE.Mesh(geo(pos2,idx2),shell(underTex,{bump:1.5,rough:.6}));
  body.add(top,under);dis.push(topTex,underTex,top.material,under.material);
  const mLeg=shell(shellTex(128,64,(g,w,h,rand)=>{const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#7a3c16');gr.addColorStop(.5,'#c0702e');gr.addColorStop(1,'#d88a3c');g.fillStyle=gr;g.fillRect(0,0,w,h);speckle(g,w,h,rand,300,['#5a2a10','#e8a860'],.6,1.6,.5)}),{bump:1.2});
  const mJoint=plain('#4a2410',.5),mClaw=shell(shellTex(256,128,(g,w,h,rand)=>{const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#9a4a14');gr.addColorStop(.6,'#d27a2c');gr.addColorStop(1,'#e8a04a');g.fillStyle=gr;g.fillRect(0,0,w,h);speckle(g,w,h,rand,700,['#8a3e12','#f0b868'],.8,2.2,.45)}),{bump:1.5,rough:.32});
  const mFinger=plain('#ead6a2',.3),mTip=plain('#3a2a1c',.4),mEye=plain('#0b0907',.12);
  dis.push(mLeg,mJoint,mClaw,mFinger,mTip,mEye,mLeg.map,mClaw.map);
  // Eyes on short stalks in the front notches.
  const eyes=[];for(const s of[1,-1]){const st=chain(body,[Lc*.88,.17,s*.15],[{len:.13,r0:.03,r1:.026,mat:mClaw,yaw:-s*.25,pitch:1.15}],dis)[0];
    const e=new THREE.Mesh(new THREE.SphereGeometry(.042,14,10),mEye);e.position.x=.14;st.add(e);dis.push(e.geometry);eyes.push(st)}
  // Walking legs: 4 pairs, out and up to the knee, then down to a sharp tip.
  const legs=[];[[.22,.62],[.06,.2],[-.12,-.2],[-.28,-.62]].forEach(([x,spread],i)=>{for(const s of[1,-1]){
    const z=s*Wc*(.82-.12*Math.abs(x)),js=chain(body,[x,.0,z],[
      {len:.1,r0:.05,r1:.05,mat:mLeg,yaw:-s*(Math.PI/2-spread),pitch:.12,knob:mJoint},
      {len:.44,r0:.052,r1:.046,flat:.62,mat:mLeg,pitch:.16,knob:mJoint},
      {len:.2,r0:.042,r1:.038,flat:.7,mat:mLeg,pitch:-1.0,knob:mJoint},
      {len:.24,r0:.036,r1:.026,flat:.75,mat:mLeg,pitch:-.3},
      {len:.22,r0:.024,r1:.004,mat:mTip,pitch:-.25}],dis);
    legs.push({js,s,i})}});
  // Claws: one large, one small, held in front with the fingers pointing inwards.
  const claws=[];for(const s of[1,-1]){const big=s>0?1:.62;
    const js=chain(body,[Lc*.62,.0,s*Wc*.62],[
      {len:.2*big+.06,r0:.06,r1:.065,mat:mClaw,yaw:-s*.85,pitch:.2,knob:mClaw},
      {len:.16*big+.04,r0:.07*big+.02,r1:.09*big+.02,mat:mClaw,yaw:s*1.15,pitch:-.12,knob:mClaw},
      {len:.4*big,r0:.15*big,r1:.15*big,flat:1.25,mat:mClaw,yaw:s*.7,pitch:-.05}],dis);
    const palm=js[2],fixed=chain(palm,[.36*big,-.07*big,0],[{len:.26*big,r0:.07*big,r1:.035*big,flat:.8,mat:mFinger,pitch:-.1},{len:.12*big,r0:.03*big,r1:.008,mat:mFinger,pitch:.35}],dis);
    const mov=chain(palm,[.32*big,.1*big,0],[{len:.29*big,r0:.06*big,r1:.032*big,flat:.8,mat:mFinger,pitch:.28},{len:.12*big,r0:.03*big,r1:.008,mat:mFinger,pitch:-.55}],dis);
    claws.push({js,mov,s,big})}
  body.position.y=.38;root.scale.setScalar(1);
  let pinchAt=1.5;
  return{root,disposables:dis,update(t,dt,playing){if(!playing)return;
    const w=t*5.5,side=Math.sin(t*.55);
    body.position.z=.16*side;body.position.y=.38+.02*Math.abs(Math.sin(w));body.rotation.x=.04*Math.sin(w);
    for(const l of legs){const ph=w+((l.i+(l.s>0?0:1))%2?Math.PI:0),[,ry,rz]=l.js[0].userData.rest;
      l.js[0].rotation.y=ry+.2*Math.sin(ph);l.js[0].rotation.z=rz+.22*Math.max(0,Math.cos(ph));l.js[2].rotation.z=l.js[2].userData.rest[2]+.12*Math.cos(ph)}
    if(t>pinchAt+1.6)pinchAt=t+2+Math.random()*2.5;
    for(const c of claws){const k=t-pinchAt,open=k<0?0:k<.25?smooth(k/.25):k<.7?1:1-smooth((k-.7)/.25);
      c.mov[0].rotation.z=c.mov[0].userData.rest[2]+.55*open*(c.s>0?1:.7);c.js[0].rotation.z=c.js[0].userData.rest[2]+.12*open+.04*Math.sin(t*1.3+c.s)}
    for(const e of eyes)e.rotation.z=e.userData.rest[2]+.08*Math.sin(t*2.1+e.position.z*20)}};
}

function buildCrayfish(){
  const root=new THREE.Group(),dis=[],body=new THREE.Group();root.add(body);
  const olive=(g,w,h,rand,top,side,lines)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,top);gr.addColorStop(.55,side[0]);gr.addColorStop(1,side[1]);g.fillStyle=gr;g.fillRect(0,0,w,h);
    speckle(g,w,h,rand,1600,['#3a3320','#b5a46a','#2f4a44'],.6,2,.4);if(lines)lines(g,w,h)};
  // Carapace: a lathe along x (tail end at 0, head at .82), narrower at the head, plus a pointed rostrum.
  const prof=[V2(0,0)];for(let i=1;i<=24;i++){const t=i/24;prof.push(V2(.215*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.05)),.55)*(1-.35*t),t*.82))}prof.push(V2(0,.82));
  const cg=new THREE.LatheGeometry(prof,40);cg.rotateZ(-Math.PI/2);cg.scale(1,.92,1.08);
  { // map u along the body, v around it (top in the middle of the texture)
    const p=cg.attributes.position,uvs=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uvs[i*2]=p.getX(i)/.82;uvs[i*2+1]=.5+Math.atan2(p.getZ(i),p.getY(i))/TAU}cg.setAttribute('uv',new THREE.BufferAttribute(uvs,2))}
  const cTex=shellTex(512,256,(g,w,h,rand)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#4d6a60');gr.addColorStop(.3,'#6d6440');gr.addColorStop(.5,'#857646');gr.addColorStop(.7,'#6d6440');gr.addColorStop(1,'#4d6a60');g.fillStyle=gr;g.fillRect(0,0,w,h);
    g.strokeStyle='#2a2616';g.lineWidth=5;g.globalAlpha=.8;g.beginPath();g.moveTo(w*.55,0);g.quadraticCurveTo(w*.5,h*.5,w*.55,h);g.stroke(); // cervical groove
    g.lineWidth=2;g.beginPath();g.moveTo(w*.62,h*.5);g.lineTo(w,h*.5);g.stroke();g.globalAlpha=1;
    speckle(g,w,h,rand,2400,['#2e2a18','#a89a62','#2c463f'],.6,2.2,.45)});
  const mCar=shell(cTex,{bump:2.4,rough:.38}),car=new THREE.Mesh(cg,mCar);car.position.x=.12;body.add(car);dis.push(cg,cTex,mCar);
  const rg=segGeo(.26,.07,.008,.45);const ros=new THREE.Mesh(rg,mCar);ros.position.set(.9,.05,0);ros.rotation.z=-.08;body.add(ros);dis.push(rg);
  // Abdomen: six overlapping armour bands on a chain of pivots so it can curl for the tail flick.
  const aTex=shellTex(256,128,(g,w,h,rand)=>{olive(g,w,h,rand,'#857646',['#6d6440','#4d6a60']);g.fillStyle='#b4a874';g.globalAlpha=.55;g.fillRect(w*.78,0,w*.22,h);g.globalAlpha=1});
  const mAb=shell(aTex,{bump:2,rough:.38,opts:{side:THREE.DoubleSide}});dis.push(aTex,mAb);
  const mUnder=plain('#8c8a6c',.55);dis.push(mUnder);
  const segs=[];let parent=body,px=.14;
  for(let i=0;i<6;i++){const r=.185-i*.016,len=.16-i*.007,pv=new THREE.Group();pv.position.set(i?-segs[i-1].len*.9:px,i?-.008:.0,0);parent.add(pv);
    const arc=Math.PI*1.4,g=new THREE.LatheGeometry([V2(r*.86,0),V2(r*.97,len*.22),V2(r,len*.6),V2(r*.95,len*1.05),V2(r*.88,len*1.12)],28,Math.PI*1.5-arc/2,arc);
    g.rotateZ(Math.PI/2);g.scale(1,.95,1.08);g.translate(len*.1,0,0);
    const m=new THREE.Mesh(g,mAb);pv.add(m);dis.push(g);
    const ug=new THREE.SphereGeometry(1,16,8);ug.scale(len*.62,r*.32,r*.84);const um=new THREE.Mesh(ug,mUnder);um.position.set(-len*.45,-r*.5,0);pv.add(um);dis.push(ug); // underside plate
    // side plates (pleura) hanging down each side
    for(const s of[1,-1]){const pg=new THREE.SphereGeometry(1,10,8,0,Math.PI,0,Math.PI);pg.scale(len*.5,r*.5,.02);const pm=new THREE.Mesh(pg,mAb);pm.position.set(-len*.5,-r*.5,s*r*1.02);pm.rotation.y=s>0?0:Math.PI;pv.add(pm);dis.push(pg)}
    segs.push({pv,len});parent=pv}
  // Tail fan: telson plus two pairs of uropods.
  const fTex=shellTex(128,128,(g,w,h,rand)=>{g.fillStyle='#6f9585';g.fillRect(0,0,w,h);g.strokeStyle='#3d5a50';g.lineWidth=2;for(let i=0;i<9;i++){g.beginPath();g.moveTo(w*i/8,0);g.lineTo(w*i/8,h);g.stroke()}speckle(g,w,h,rand,300,['#88a090','#203028'],.6,1.6,.5)});
  const mFan=new THREE.MeshPhysicalMaterial({map:fTex,side:THREE.DoubleSide,roughness:.4,clearcoat:.5,transparent:true,opacity:.95});dis.push(fTex,mFan);
  const fan=new THREE.Group();fan.position.x=-segs[5].len*.85;parent.add(fan);
  const blade=(w,l)=>{const s=new THREE.Shape();s.moveTo(0,-w*.25);s.quadraticCurveTo(-l*.6,-w*.75,-l,-w*.4);s.quadraticCurveTo(-l*1.08,0,-l,w*.4);s.quadraticCurveTo(-l*.6,w*.75,0,w*.25);const g=new THREE.ShapeGeometry(s,8);g.rotateX(Math.PI/2);dis.push(g);return g};
  for(const [a,w,l] of [[0,.13,.24],[.42,.11,.23],[-.42,.11,.23],[.78,.1,.2],[-.78,.1,.2]]){const m=new THREE.Mesh(blade(w,l),mFan);m.rotation.y=a;m.rotation.z=.08;fan.add(m)}
  // Materials for limbs.
  const mClaw=shell(shellTex(256,128,(g,w,h,rand)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#3b1f14');gr.addColorStop(.45,'#7a2e1e');gr.addColorStop(1,'#b8462c');g.fillStyle=gr;g.fillRect(0,0,w,h);speckle(g,w,h,rand,900,['#2a140c','#c8603c'],.6,2,.45)}),{bump:1.8,rough:.34});
  const mLeg=shell(shellTex(64,64,(g,w,h,rand)=>{g.fillStyle='#6f7a74';g.fillRect(0,0,w,h);speckle(g,w,h,rand,200,['#9aa49c','#3e4640'],.5,1.4,.5)}),{bump:1});
  const mJoint=plain('#c8602e',.45),mSignal=plain('#e9f2ee',.3),mAnt=plain('#2c1d18',.5),mEye=plain('#070707',.1);
  dis.push(mClaw,mLeg,mJoint,mSignal,mAnt,mEye,mClaw.map,mLeg.map);
  // Eyes, antennae, antennules.
  for(const s of[1,-1]){const e=new THREE.Mesh(new THREE.SphereGeometry(.035,12,10),mEye);e.position.set(.86,.1,s*.07);body.add(e);dis.push(e.geometry)}
  const ants=[];for(const s of[1,-1]){const pts=[];for(let i=0;i<=16;i++){const f=i/16;pts.push(new THREE.Vector3(.95*Math.sin(f*1.9)+.05*f,.22*f-.12*f*f,s*(.03+.55*f*f)))}
    const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),48,.009,5),a=new THREE.Group();a.position.set(.9,.06,s*.06);a.add(new THREE.Mesh(g,mAnt));a.userData.noFit=true;body.add(a);ants.push({a,s});dis.push(g);
    for(const k of[.6,1]){const q=[];for(let i=0;i<=6;i++){const f=i/6;q.push(new THREE.Vector3(.28*f,.08*f*k,s*.04*f*k))}const ag=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(q),12,.005,4),am=new THREE.Mesh(ag,mAnt);am.position.set(.93,.08,s*.03);body.add(am);dis.push(ag)}
    const sc=segGeo(.14,.03,.01,.3),sm=new THREE.Mesh(sc,mClaw);sm.position.set(.86,.03,s*.1);sm.rotation.y=-s*.3;body.add(sm);dis.push(sc)}
  // Claws (chelipeds): held forward, palms flattened, white "signal" patch at the hinge.
  const claws=[];for(const s of[1,-1]){const js=chain(body,[.74,-.08,s*.1],[
      {len:.24,r0:.04,r1:.045,mat:mClaw,yaw:-s*.75,pitch:-.12,knob:mClaw},
      {len:.17,r0:.05,r1:.055,mat:mClaw,yaw:s*.85,pitch:.05,knob:mSignal},
      {len:.4,r0:.115,r1:.1,flat:.48,mat:mClaw,yaw:s*.05,pitch:-.02}],dis);
    const palm=js[2];chain(palm,[.37,-.01,-s*.045],[{len:.3,r0:.055,r1:.014,flat:.55,mat:mClaw,pitch:.02,yaw:s*.07}],dis);
    const mov=chain(palm,[.34,.01,s*.05],[{len:.3,r0:.05,r1:.012,flat:.55,mat:mClaw,pitch:.08,yaw:-s*.1}],dis);
    claws.push({js,mov,s})}
  // Walking legs: 4 pairs, thin, with orange joints.
  const legs=[];[.62,.5,.38,.26].forEach((x,i)=>{for(const s of[1,-1]){const js=chain(body,[x,-.12,s*.11],[
      {len:.17,r0:.022,r1:.02,mat:mLeg,yaw:-s*(Math.PI/2-(.5-i*.32)),pitch:.12,knob:mJoint},
      {len:.13,r0:.019,r1:.017,mat:mLeg,pitch:-1.15,knob:mJoint},
      {len:.13,r0:.016,r1:.012,mat:mLeg,pitch:-.35,knob:mJoint},
      {len:.07,r0:.011,r1:.003,mat:mJoint,pitch:-.25}],dis);legs.push({js,s,i})}});
  body.position.set(-.08,.12,0);let flick=4;
  return{root,disposables:dis,update(t,dt,playing){if(!playing)return;
    const w=t*4;for(const l of legs){const ph=w+l.i*1.3+(l.s>0?0:Math.PI),[,ry,rz]=l.js[0].userData.rest;l.js[0].rotation.y=ry+.16*Math.sin(ph);l.js[0].rotation.z=rz+.15*Math.max(0,Math.cos(ph))}
    for(const a of ants){a.a.rotation.y=a.s*.12*Math.sin(t*1.1+a.s)+.06*Math.sin(t*3.1);a.a.rotation.z=.05*Math.sin(t*1.7+a.s)}
    for(const c of claws){c.mov[0].rotation.z=c.mov[0].userData.rest[2]+.32*Math.max(0,Math.sin(t*1.5+c.s*.8));c.js[0].rotation.y=c.js[0].userData.rest[1]+.1*Math.sin(t*.7+c.s)}
    // Tail flick: curl the tail under fast, dart backwards, then ease back out.
    if(t>flick+1.8)flick=t+4+Math.random()*3;const k=t-flick,c=k<0?0:k<.18?smooth(k/.18):1-smooth((k-.18)/1.2);
    segs.forEach((s,i)=>{s.pv.rotation.z=i?c*.5:c*.2});fan.rotation.z=c*.6;
    body.position.x=-.08-.55*Math.sin(Math.min(1,Math.max(0,k/1.4))*Math.PI)*(k>0?1:0);body.position.y=.12+.03*c}};
}

// -------------------------------------------------------------------- viewer
export function mount(host,name){
  const P=resolve(name),crust=P.crab||P.crayfish,canvas=document.createElement('canvas');canvas.className='m3dCanvas';
  let renderer;try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true})}catch(e){host.innerHTML='<div class="m3dMsg">3D view needs WebGL, which this browser has turned off.</div>';return{dispose(){}}}
  host.innerHTML='';host.append(canvas);
  const ui=document.createElement('div');ui.className='m3dUi';ui.innerHTML='<button type="button" data-m3d="play" aria-label="Pause swimming">❚❚</button><button type="button" data-m3d="reset" aria-label="Reset view">↺</button>';host.append(ui);
  const hint=document.createElement('div');hint.className='m3dHint';hint.textContent='Loading model…';host.append(hint);
  canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`3D model of ${name}. Use the arrow keys to spin it and + or − to zoom.`);
  renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,50);
  scene.add(new THREE.HemisphereLight('#d8f4ff','#22342e',1.9));
  const key=new THREE.DirectionalLight('#ffffff',2.2);key.position.set(2,4,3);scene.add(key);
  const rim=new THREE.DirectionalLight('#7fe0c8',1.1);rim.position.set(-3,1.5,-2.5);scene.add(rim);
  const view=new THREE.Group(),swim=new THREE.Group();view.add(swim);scene.add(view);
  let model=null,gone=false,fitPts=null;
  // Centre the model and keep a sample of its points (antennae and other noFit parts left out)
  // so the camera can be framed on what's actually visible from the starting angle.
  const use=(m,kind)=>{if(gone){for(const d of m.disposables)d.dispose&&d.dispose();return}host.dataset.model=kind;model=m;
    const holder=new THREE.Group();holder.add(m.root);swim.add(holder);m.update(0,0,false);holder.updateMatrixWorld(true);
    const inv=holder.matrixWorld.clone().invert(),M=new THREE.Matrix4(),v=new THREE.Vector3(),pts=[],box=new THREE.Box3();
    m.root.traverse(o=>{if(!o.isMesh)return;for(let a=o;a;a=a.parent)if(a.userData.noFit)return;
      M.multiplyMatrices(inv,o.matrixWorld);const pa=o.geometry.attributes.position,step=Math.max(1,Math.floor(pa.count/400));
      for(let i=0;i<pa.count;i+=step){v.fromBufferAttribute(pa,i).applyMatrix4(M);pts.push(v.clone());box.expandByPoint(v)}});
    const c=box.getCenter(new THREE.Vector3());holder.position.copy(c).negate();fitPts=pts.map(p=>p.sub(c));resize();
    hint.textContent=matchMedia('(pointer: fine)').matches?'Drag to spin · Ctrl + scroll to zoom · double-click to reset':'Drag to spin · pinch to zoom';host.classList.add('m3dReady')};
  const slug=name.replace(/[^A-Za-z0-9]+/g,'-').replace(/-+$/,''),S=SHAPES[slug];
  const start=()=>{if(crust||!S)use(P.crab?buildCrab(P):P.crayfish?buildCrayfish(P):buildFish(P,name,swim),'built');
  else new THREE.TextureLoader().load('./fish-tex/'+slug+'.webp',tex=>{tex.colorSpace=THREE.SRGBColorSpace;tex.flipY=false;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();use(buildTextured(P,S,tex,swim),'picture')},undefined,()=>use(buildFish(P,name,swim),'generated'))};
  // Drifting specks for an underwater feel.
  const pg=new THREE.BufferGeometry(),pp=[];for(let i=0;i<160;i++)pp.push((Math.random()-.5)*7,(Math.random()-.5)*4,(Math.random()-.5)*4-1);
  pg.setAttribute('position',new THREE.Float32BufferAttribute(pp,3));const pm=new THREE.PointsMaterial({color:'#bfeee0',size:.025,transparent:true,opacity:.45,depthWrite:false});
  const specks=new THREE.Points(pg,pm);scene.add(specks);
  const rest={yaw:P.crab?-.7:P.crayfish?-.55:Math.PI+.4,pitch:P.crab?.55:P.crayfish?.38:.16,zoom:1};let yaw=rest.yaw,pitch=rest.pitch,zoom=1,fit=4,vy=0,idle=0,playing=true,visible=true,raf=0,last=0;
  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    const tn=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tw=tn*camera.aspect;
    if(!fitPts){fit=1.6/Math.min(tn,tw);return}
    const cy=Math.cos(rest.yaw),sy=Math.sin(rest.yaw),cp=Math.cos(rest.pitch),sp=Math.sin(rest.pitch);let d=0;
    for(const p of fitPts){const x=p.x*cy+p.z*sy,z=-p.x*sy+p.z*cy,sx=Math.abs(x),syv=Math.abs(p.y*cp-z*sp),depth=p.y*sp+z*cp;
      d=Math.max(d,depth+sx*1.1/tw,depth+syv*1.12/tn)}
    fit=d+.15};
  const ro=new ResizeObserver(resize);ro.observe(host);resize();start();
  const pts=new Map();let pinch0=0,zoom0=1;
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);vy=0;idle=0;
    if(pts.size===2){const [a,b]=[...pts.values()];pinch0=Math.hypot(a[0]-b[0],a[1]-b[1]);zoom0=zoom}});
  canvas.addEventListener('pointermove',e=>{const p=pts.get(e.pointerId);if(!p)return;const dx=e.clientX-p[0],dy=e.clientY-p[1];pts.set(e.pointerId,[e.clientX,e.clientY]);
    if(pts.size===1){yaw+=dx*.012;vy=dx*.012;if(e.pointerType==='mouse')pitch=Math.max(-.9,Math.min(.9,pitch+dy*.01))}
    else if(pts.size===2&&pinch0){const [a,b]=[...pts.values()];zoom=Math.max(.45,Math.min(1.8,zoom0*pinch0/Math.hypot(a[0]-b[0],a[1]-b[1])))}idle=0});
  const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch0=0};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  canvas.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();zoom=Math.max(.45,Math.min(1.8,zoom*(e.deltaY>0?1.08:.93)))},{passive:false});
  const reset=()=>{yaw=rest.yaw;pitch=rest.pitch;zoom=1;vy=0;idle=0};canvas.addEventListener('dblclick',reset);
  canvas.addEventListener('keydown',e=>{const k=e.key;idle=0;
    if(k==='ArrowLeft')yaw-=.2;else if(k==='ArrowRight')yaw+=.2;else if(k==='ArrowUp')pitch=Math.max(-.9,pitch-.15);else if(k==='ArrowDown')pitch=Math.min(.9,pitch+.15);
    else if(k==='+'||k==='=')zoom=Math.max(.45,zoom*.9);else if(k==='-')zoom=Math.min(1.8,zoom*1.1);else if(k==='0'||k==='Home')reset();else return;e.preventDefault()});
  ui.addEventListener('click',e=>{const b=e.target.closest('[data-m3d]');if(!b)return;
    if(b.dataset.m3d==='reset')reset()
    else{playing=!playing;b.textContent=playing?'❚❚':'▶';b.setAttribute('aria-label',playing?'Pause swimming':'Play swimming')}});
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduce){playing=false;ui.firstChild.textContent='▶';ui.firstChild.setAttribute('aria-label','Play swimming')}
  let clock=0;
  const frame=now=>{raf=0;const dt=Math.min(.05,last?(now-last)/1000:.016);last=now;if(playing)clock+=dt;
    if(!pts.size){yaw+=vy;vy*=.92;idle+=dt;if(idle>3&&playing)yaw+=dt*.18}
    view.rotation.set(0,yaw,0);const dist=fit*zoom;camera.position.set(0,Math.sin(pitch)*dist,Math.cos(pitch)*dist);camera.lookAt(0,0,0);
    if(model)model.update(clock,playing?dt:0,playing);
    if(playing){const a=pg.attributes.position.array;for(let i=1;i<a.length;i+=3){a[i]+=dt*.06;if(a[i]>2)a[i]=-2}pg.attributes.position.needsUpdate=true}
    renderer.render(scene,camera);loop()};
  const loop=()=>{if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(frame)};
  const io=new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible){last=0;loop()}});io.observe(host);
  const vis=()=>{if(!document.hidden){last=0;loop()}};document.addEventListener('visibilitychange',vis);loop();
  return{dispose(){cancelAnimationFrame(raf);raf=-1;io.disconnect();ro.disconnect();document.removeEventListener('visibilitychange',vis);
    gone=true;if(model)for(const d of model.disposables)d.dispose&&d.dispose();pg.dispose();pm.dispose();renderer.dispose();renderer.forceContextLoss()}};
}
export const SPECIES_NAMES=Object.keys(SPECIES);
