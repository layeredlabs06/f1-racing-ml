import * as THREE from 'three';

// All gameplay physics live in an (x, z) ground plane so the 2D simulation
// logic from the original p5 sketch ports over 1:1. Y is up for rendering.
//
// Track geometry is real-world coordinates projected from the authoritative
// F1 circuit GeoJSON published by https://github.com/bacinger/f1-circuits
// (equirectangular projection relative to each track's bbox center — meters).
// Values are then multiplied by TRACK_SCALE so the gameplay constants that
// were tuned for the earlier hand-drawn layouts still feel right.
//
// Each layout may also define an "elevation" profile: an array of
// [normalized_progress_0_to_1, height_in_meters] control points that are
// linearly interpolated along the centerline. These approximate the
// iconic real-world elevation features of each circuit.

export const TRACK_SCALE = 3.0;
export const SENSOR_LENGTH = 220;

export const TRACK_LAYOUTS = {
  // Circuit de Monaco — 3337 m, 159 surveyed points, ~42 m total elevation
  Monaco: {
    points: [
      [112.72,-296.78], [111.12,-306.8], [113.37,-315.81], [119.16,-328.17], [124.63,-336.85], [141.68,-358.45],
      [228.3,-476.12], [234.34,-484.58], [243.26,-487.14], [254.12,-484.02], [261.68,-477.79], [267.15,-467.99],
      [268.28,-456.97], [268.52,-447.84], [269.4,-440.38], [273.91,-431.48], [279.14,-424.69], [288.87,-410.99],
      [295.46,-398.86], [298.04,-391.51], [301.34,-387.17], [306.56,-385.72], [312.6,-387.5], [317.1,-392.18],
      [318.47,-398.86], [315.49,-404.54], [307.85,-410.1], [285.25,-438.82], [282.03,-445.73], [281.95,-452.4],
      [283.72,-457.53], [286.13,-462.31], [296.75,-467.77], [313.16,-472], [322.09,-475.34], [331.26,-479.01],
      [343.96,-483.46], [357.8,-484.46], [365.12,-480.79], [367.85,-469.44], [365.28,-403.09], [355.06,-334.85],
      [344.45,-291.44], [332.62,-260.49], [312.36,-225.09], [289.03,-195.14], [255.25,-158.3], [206.91,-128.69],
      [178.12,-114.55], [122.62,-88.61], [85.3,-75.7], [30.2,-62.67], [-5.27,-57.11], [-24.09,-53.54],
      [-27.31,-48.09], [-27.55,-43.3], [-28.67,-37.74], [-31.09,-32.28], [-39.05,-29.5], [-50.31,-27.61],
      [-62.78,-34.73], [-69.61,-35.18], [-168.87,-22.15], [-218.17,-15.03], [-263.53,-7.9], [-276.08,-6.01],
      [-284.45,-4.56], [-290.48,1.67], [-299.97,20.37], [-308.01,38.52], [-314.45,56.66], [-317.26,69.57],
      [-320.24,92.06], [-320.48,130.58], [-320.08,140.15], [-317.26,146.72], [-311.63,153.07], [-299.16,162.19],
      [-290.8,169.87], [-287.18,178.11], [-285.73,190.02], [-271.58,271.95], [-267.96,286.32], [-266.83,290.88],
      [-267.15,297], [-270.77,301.9], [-278.73,307.47], [-286.7,311.36], [-288.55,316.93], [-287.02,328.62],
      [-277.93,355.22], [-269.65,375.26], [-261.2,391.07], [-246.72,411.77], [-228.55,430.14], [-215.19,437.82],
      [-200.23,444.83], [-192.75,448.17], [-188.97,452.4], [-184.63,465.43], [-186.72,472.33], [-193.48,476.34],
      [-223.48,484.24], [-240.21,486.91], [-251.23,487.14], [-261.04,485.69], [-267.23,481.01], [-271.01,477.12],
      [-271.17,467.99], [-272.62,460.64], [-275.52,451.63], [-292.41,430.81], [-304.79,410.88], [-314.45,395.97],
      [-324.66,367.69], [-347.26,288.99], [-353.46,263.61], [-357.8,236.44], [-363.43,196.81], [-367.85,145.27],
      [-367.85,111.65], [-366.41,85.94], [-363.59,59.22], [-358.6,40.63], [-352.97,23.93], [-350.24,13.69],
      [-348.87,4.68], [-349.51,-9.02], [-349.76,-17.48], [-347.02,-22.49], [-340.02,-25.83], [-322.97,-29.95],
      [-307.77,-30.61], [-286.94,-33.17], [-257.9,-36.85], [-232.17,-41.41], [-166.69,-60.67], [-130.1,-70.69],
      [-96.56,-76.14], [-73.55,-78.04], [-55.62,-84.49], [-3.74,-109.09], [19.02,-118.44], [52.24,-125.9],
      [79.99,-129.8], [106.45,-134.25], [121.33,-139.48], [139.43,-150.84], [155.11,-167.2], [163.96,-181.01],
      [167.9,-195.48], [167.26,-210.62], [164.68,-224.87], [159.05,-240.56], [151.57,-255.48], [139.83,-264.61],
      [128.57,-275.18], [123.1,-279.97], [118.03,-285.09],
    ],
    width: 38,
    elevation: [
      [0.00, 0], [0.08, 4], [0.18, 14], [0.28, 20], [0.38, 22],
      [0.48, 16], [0.58, 6], [0.68, -2], [0.78, -6], [0.88, -3], [1.00, 0],
    ],
  },

  // Suzuka International Racing Course — 5807 m, 171 points, figure-8 crossover
  Suzuka: {
    points: [
      [695.08,35.73], [816.23,181.56], [957.93,355.22], [970.9,373.59], [978.12,392.74], [981.87,409.99],
      [981.59,426.91], [979.49,439.94], [962.95,491.03], [955.1,504.39], [943.68,514.52], [934.08,519.98],
      [916.82,524.21], [901.1,523.65], [883.83,517.86], [867.76,505.17], [851.4,480.46], [767.81,352.11],
      [752,338.64], [738.39,334.29], [717.83,330.73], [674.62,330.4], [652.87,324.16], [637.52,313.37],
      [625.92,299.23], [620.44,285.42], [600.98,211.51], [592.85,192.58], [579.87,176.33], [564.8,165.31],
      [545.8,156.4], [526.34,152.73], [476.09,151.95], [452.88,147.5], [436.98,139.93], [420.54,127.24],
      [408.48,109.54], [401.08,91.51], [397.7,74.47], [397.88,58.22], [400.99,44.42], [425.66,-23.04],
      [429.4,-36.74], [430.04,-54.77], [427.39,-66.68], [420.9,-83.94], [411.22,-98.63], [392.67,-111.77],
      [370.11,-124.01], [343.34,-137.48], [319.77,-146.94], [302.23,-151.84], [277.56,-155.96], [249.6,-156.4],
      [227.58,-155.51], [209.22,-150.62], [194.33,-144.27], [171.12,-134.36], [146.73,-120.67], [118.68,-97.74],
      [96.75,-74.47], [4.57,37.29], [-0.18,43.75], [-14.89,47.2], [-149.56,59.33], [-158.24,58.22],
      [-167.47,51.99], [-171.21,41.41], [-172.86,32.51], [-193.32,-51.65], [-220.64,-209.73], [-225.85,-238.78],
      [-227.13,-253.48], [-225.66,-268.62], [-222.74,-284.31], [-216.53,-300.56], [-209.49,-316.71], [-187.75,-366.58],
      [-185.46,-374.26], [-187.11,-381.27], [-191.22,-387.73], [-198.26,-392.51], [-206.39,-395.07], [-214.24,-394.52],
      [-223.2,-388.51], [-230.6,-377.82], [-262.3,-323.05], [-288.06,-281.75], [-304.87,-257.26], [-318.76,-241.12],
      [-330.73,-230.88], [-351.29,-214.62], [-372.94,-203.05], [-395.6,-196.26], [-435.07,-190.47], [-472.43,-188.91],
      [-500.57,-191.03], [-534.1,-198.37], [-570.83,-208.72], [-611.94,-224.09], [-637.89,-236.11], [-660.64,-249.8],
      [-681.65,-265.5], [-703.85,-285.42], [-726.78,-310.81], [-741.95,-332.96], [-755.56,-357.23], [-789.18,-446.73],
      [-807.18,-485.91], [-816.32,-501.61], [-828.74,-513.19], [-845.01,-520.53], [-864.47,-524.21], [-887.76,-523.65],
      [-909.32,-520.53], [-930.43,-515.86], [-950.99,-507.4], [-967.8,-494.59], [-977.94,-478.34], [-981.87,-462.42],
      [-980.68,-442.39], [-976.11,-427.47], [-969.44,-412.44], [-958.02,-399.86], [-935.45,-378.71], [-907.22,-355.22],
      [-879.63,-331.07], [-844.64,-304.57], [-804.62,-277.3], [-763.69,-251.69], [-717.92,-229.88], [-676.99,-208.95],
      [-634.97,-192.92], [-566.72,-169.32], [-491.62,-140.04], [-400.71,-108.2], [-310.54,-79.71], [-248.14,-58.11],
      [-167.47,-27.27], [-149.01,-22.6], [-130.65,-22.04], [-111.19,-25.71], [-92.28,-30.95], [-58.2,-44.08],
      [-26.86,-59.78], [-0.55,-76.03], [26.68,-97.18], [77.57,-144.83], [147.28,-209.84], [166.64,-225.87],
      [180.44,-235.55], [193.05,-243.9], [202,-249.25], [206.84,-249.69], [213.24,-247.02], [228.95,-232.99],
      [240.28,-223.53], [249.51,-220.86], [258.19,-222.53], [268.42,-229.32], [285.23,-244.57], [304.14,-258.15],
      [325.25,-267.06], [351.01,-269.28], [375.04,-267.95], [400.44,-262.72], [425.84,-252.81], [447.4,-242.45],
      [474.44,-224.09], [498.74,-201.49], [523.69,-173.66],
    ],
    width: 38,
    // Subtle rolling terrain; crossover bridge handled via bridgeSegments
    elevation: [
      [0.00, 2], [0.10, 4], [0.25, 1], [0.35, -2], [0.50, -1],
      [0.65, 2], [0.80, 4], [0.92, 6], [1.00, 2],
    ],
    // The back section that crosses over the front is lifted ~9 m to form
    // the iconic bridge. Range is expressed in normalized progress [0..1].
    bridgeSegments: [[0.77, 0.92]],
    bridgeHeight: 9,
  },

  // Circuit de Spa-Francorchamps — 7004 m, 152 points, ~100 m total elevation
  Spa: {
    points: [
      [-252.5,-813], [-366,-1011.4], [-367.2,-1020.3], [-362.2,-1028.2], [-351.7,-1031.9], [-340,-1028.7],
      [-302.6,-1009.8], [-211.9,-966.3], [-168.3,-939.5], [-122.9,-905.9], [-82.2,-871.8], [-50,-836.6],
      [123.4,-629.9], [135.6,-618.3], [156.5,-605.3], [193.8,-581.1], [210.2,-564.9], [224.1,-542.9],
      [232.9,-522.8], [238.8,-500.3], [243.8,-458.8], [246.7,-444.1], [251.8,-430.5], [261.4,-412.7],
      [347.1,-275.7], [401.6,-188.6], [416.7,-156.1], [426.3,-132], [437.7,-93.1], [506.1,145.7],
      [611,508.2], [635.4,595.4], [636.6,609.5], [634.1,625.2], [625.7,637.8], [613.5,648.4],
      [598,656.7], [588.8,665.6], [582.5,676.1], [577.4,691.9], [578.3,707.6], [599.3,801.6],
      [598.8,817.8], [595.5,832.5], [584.2,848.8], [570.7,859.8], [331.5,1025.1], [316.4,1031.4],
      [301.3,1031.9], [285.4,1027.2], [272.3,1017.7], [263.1,1004.2], [259.4,990.5], [258.5,975.8],
      [263.1,962.1], [271.5,947.9], [283.7,938], [388.2,873.5], [399.5,861.9], [405.8,850.3],
      [408.3,836.7], [407.1,819.9], [363.8,692.9], [350.4,641], [319.8,481], [304.7,389.1],
      [301.3,373.4], [293.7,356.6], [283.7,342.9], [268.6,328.2], [251.8,317.2], [233.3,309.9],
      [214,306.7], [151.4,302.5], [127.6,305.2], [105.7,311.4], [83.5,320.9], [65.4,333],
      [44.5,352.4], [31.1,371.8], [16.4,399.6], [-42.8,547.6], [-95.7,679.3], [-107.1,699.8],
      [-120.5,714], [-138.9,724.4], [-157.4,729.6], [-174.6,730.2], [-191.8,726.5], [-206.5,719.7],
      [-230.9,703.9], [-246.8,697.1], [-266.1,694], [-285.4,696.1], [-303,701.8], [-318.1,712.4],
      [-327.8,724.4], [-339.6,740.7], [-436.5,892.8], [-446.1,901.7], [-457.9,908.1], [-472.1,911.2],
      [-488.1,910.2], [-501.9,903.9], [-567.4,856.1], [-606,827.8], [-615.6,815.3], [-625.7,800],
      [-631.6,785.3], [-635.8,767.9], [-636.6,750.1], [-633.7,728.6], [-627,710.3], [-618.2,686.7],
      [-605.2,650.9], [-582.5,610.5], [-557.7,575.4], [-520,532.9], [-457,471.5], [-420.1,442.7],
      [-388.6,424.3], [-226.6,339.8], [-203.1,325.1], [-180.9,307.7], [-160.3,288.4], [-142.7,267.3],
      [-126.3,245.3], [-104.5,205], [-86.9,166.1], [-46.6,76.4], [-39.5,56.9], [-35.2,36],
      [-34.5,9.7], [-38.6,-13.9], [-62.5,-75.3], [-88.6,-143], [-120,-227.5], [-128.1,-258.9],
      [-135.6,-296.2], [-140.2,-330.8], [-143.2,-360.2], [-152.4,-496.1], [-150.7,-505], [-145.2,-511.3],
      [-136.8,-513.5], [-122.6,-511.3], [-107.8,-511.3], [-97.8,-513.5], [-91.1,-520.8], [-89.4,-529.2],
      [-93.6,-540.2], [-145.2,-624.7],
    ],
    width: 38,
    // La Source → Eau Rouge descent → Raidillon climb → Kemmel plateau → Les Combes → Pouhon → Blanchimont → La Source again
    elevation: [
      [0.00, 18],  [0.02, 12],  [0.04, -4],  [0.06, -14], [0.09, 12],
      [0.12, 22],  [0.18, 20],  [0.25, 8],   [0.35, -2],  [0.45, -6],
      [0.55, 0],   [0.65, 6],   [0.75, 2],   [0.85, -4],  [0.95, 8],
      [1.00, 18],
    ],
  },

  // Silverstone Circuit — 5891 m, 134 points, essentially flat
  Silverstone: {
    points: [
      [97.6,-842.2], [284.3,-858.4], [317.5,-856.4], [343,-848], [359.6,-837], [379.5,-813.9],
      [392,-787.6], [402.1,-754.6], [416.4,-698.5], [430.9,-643.4], [439.4,-582.5], [443.1,-544.2],
      [447.9,-451.3], [450,-372.1], [453.2,-341.1], [465,-312.2], [487.2,-271.8], [496.6,-248.7],
      [496.2,-231.4], [492.1,-211], [460.5,-127.5], [458.5,-93.9], [463.3,-69.9], [474.7,-49.4],
      [505.9,-5.8], [513.1,14.2], [514,37.8], [508.7,59.3], [489.7,82.9], [465.4,100.2],
      [432.1,119.6], [406.2,134.9], [388,152.7], [367,187.9], [325.6,265.4], [98.4,683.7],
      [23.9,799.7], [2.8,828.1], [-14.2,843.2], [-34,853.2], [-54.7,858.4], [-73.7,856.9],
      [-94.8,852.1], [-112.6,844.3], [-128.4,831.7], [-141.8,811.7], [-145.8,803.9], [-166.1,759.8],
      [-188.7,720.4], [-213,687.9], [-229.6,668], [-248.3,647.5], [-281.1,613.9], [-354.4,526.3],
      [-361.7,521.6], [-371.8,520.5], [-381.9,525.3], [-412.7,553.1], [-423.2,556.8], [-433.8,555.7],
      [-442.6,552], [-455.2,540], [-468.6,526.3], [-485.2,504.2], [-497.3,480.6], [-505.9,456.5],
      [-513.1,429.2], [-514,418.2], [-511.9,407.2], [-505.9,396.7], [-491.3,373.5], [-267.7,81.9],
      [-217.5,17.3], [-207,5.2], [-188.7,-6.8], [-166.9,-12.1], [-149,-12.6], [-124.3,-10.5],
      [-55.5,-0.1], [-32.8,2.6], [-9.3,3.6], [17.4,-0.1], [41.7,-6.3], [63.6,-18.4],
      [206.2,-131.7], [215.5,-138], [226.8,-143.8], [238.5,-144.9], [247.4,-141.7], [255.6,-134.3],
      [260.4,-126], [284.7,-40.9], [292,-28.9], [302.1,-21.5], [313.9,-21], [326.9,-26.8],
      [334.9,-37.2], [340.2,-48.3], [350.3,-76.1], [358.4,-99.7], [364.5,-122.8], [367.7,-145.3],
      [369.8,-169], [368.1,-193.6], [363.3,-204.7], [350.8,-218.8], [-111.4,-640.7], [-123.9,-648.6],
      [-141.4,-657.5], [-162.8,-660.6], [-185.1,-658.1], [-207.7,-647], [-215.9,-637], [-221.6,-622.3],
      [-230.9,-545.7], [-236.1,-530.1], [-247.4,-517.4], [-264.5,-509], [-283.1,-506.3], [-303.7,-511.7],
      [-318.3,-521.6], [-327.2,-533.2], [-334.1,-546.7], [-335.4,-561.4], [-332.5,-577.2], [-321.2,-603],
      [-261.7,-721], [-242.6,-743.6], [-224,-762.5], [-197.2,-785.5], [-175.4,-800.8], [-147.8,-812.4],
      [-123.9,-820.2], [-73.3,-826.5],
    ],
    width: 38,
    elevation: [
      [0.00, 0], [0.25, 2], [0.50, 4], [0.75, 2], [1.00, 0],
    ],
  },

  // Autódromo José Carlos Pace - Interlagos — 4309 m, 170 points, ~40 m drop
  Interlagos: {
    points: [
      [-267.1,228.5], [-208.4,455.7], [-202.2,479.7], [-196,493.5], [-181.9,514.4], [-174.7,520.3],
      [-164.3,524.5], [-154,524.7], [-142.7,522.3], [-136.7,519.2], [-118.4,502.3], [-100.6,482.5],
      [-93.5,477.2], [-84.3,474], [-75.1,473.4], [-61.6,477.8], [-33.1,495.3], [-10.4,504.6],
      [6.4,509], [21.8,511], [35.8,511.7], [56.5,509.3], [72.3,505.8], [91.8,498.8],
      [110,488.2], [128.1,474.1], [142.7,458.7], [154.2,442.4], [162.7,427], [169.9,409.8],
      [197.8,317.5], [209.6,271.2], [229.8,192.6], [254.5,92.2], [297.8,-72.4], [313.4,-131.7],
      [324.4,-173.3], [329.5,-192.7], [331.4,-204.9], [330.2,-216.4], [327.3,-224.2], [321.1,-233.4],
      [309.9,-241.2], [296.9,-246.7], [278,-250.6], [221.6,-261.7], [199.6,-264.2], [186,-263.2],
      [169.3,-260.8], [153.5,-256.1], [139.5,-247.9], [126.2,-240.1], [113,-229.2], [100.2,-215.1],
      [82.8,-192.9], [25.5,-115.6], [-8.1,-67.9], [-36.7,-27.2], [-68.1,14], [-84.7,37],
      [-97.4,54.2], [-106.3,64], [-116.1,70.1], [-130.2,75.1], [-145.7,77.1], [-168.9,76.6],
      [-184.4,74], [-196.8,70.1], [-207.8,65.1], [-226.6,54.9], [-236,46.5], [-242.2,38.3],
      [-248.3,26.4], [-252.8,10.2], [-258.5,-13.6], [-263.2,-35.4], [-269.6,-75.5], [-270.8,-92.1],
      [-270.5,-108.9], [-266.5,-121.7], [-260.1,-128.1], [-255.6,-130.5], [-250,-132.4], [-242.3,-133.3],
      [-234.3,-131.2], [-225.8,-127.9], [-203,-110.5], [-193.8,-105.1], [-186.7,-102.1], [-179,-100.5],
      [-172,-100], [-164.3,-101], [-153.7,-104.9], [-141.1,-115.2], [-134.1,-125.7], [-130.3,-137.1],
      [-129.7,-146.9], [-131.2,-158.3], [-135.5,-167.2], [-145.3,-181.6], [-154.2,-190.5], [-185.5,-221.1],
      [-201.6,-239.6], [-212.7,-256], [-220.7,-278.1], [-226.9,-305.5], [-229.8,-322], [-231.3,-337],
      [-230.3,-349.2], [-225.5,-357.6], [-221.5,-362.6], [-215.1,-364.7], [-209.8,-366], [-203,-364.9],
      [-195,-361.7], [-156.8,-318.2], [-123.8,-281.6], [-118.1,-277], [-105.8,-268.4], [-94.4,-263.4],
      [-85.1,-260.6], [-73.5,-258.7], [-62.8,-257.5], [-50.5,-257.4], [-31.1,-260.2], [-16.4,-264.9],
      [-0.7,-274], [15.2,-286.9], [24.1,-298.6], [33.6,-311.7], [59,-351.7], [87,-398.6],
      [118.7,-450], [120.7,-456], [121.2,-463.1], [119.3,-470.1], [115.6,-477.7], [108.6,-484.2],
      [92,-492.9], [67.8,-501.7], [18.8,-520.2], [9.2,-522.8], [-3,-524.7], [-27.7,-522],
      [-49.3,-518.3], [-96.6,-508.2], [-112.3,-502.8], [-143.5,-489.8], [-158.9,-483], [-195.6,-463.2],
      [-210.1,-453.3], [-222.6,-442.2], [-235.2,-430.5], [-245.5,-418.3], [-254.7,-404.1], [-263,-385.9],
      [-269.8,-366.6], [-280.4,-327.1], [-291.9,-277.3], [-299.5,-230.4], [-312.7,-180.4], [-321.1,-142.8],
      [-328.5,-116.8], [-330.9,-97.9], [-331.4,-72.1], [-330,-41.6], [-326.6,-18.8], [-320.9,7.8],
      [-311,46.1], [-282.2,167.4],
    ],
    width: 38,
    // Senna S drops sharply from start; Junção climbs back to straight
    elevation: [
      [0.00, 18], [0.04, 10], [0.08, -4],  [0.15, -12], [0.30, -14],
      [0.50, -10], [0.65, -6], [0.78, -2], [0.88, 6],  [0.96, 14], [1.00, 18],
    ],
  },

  // Circuit of the Americas (Austin) — 5514 m, 170 points, dramatic T1 climb
  Austin: {
    points: [
      [-547.9,332], [-382.6,463.6], [-337,495.6], [-301.7,516.6], [-288.6,522.9], [-283.5,524.4],
      [-277.8,523.4], [-272.7,520.3], [-269.2,515.1], [-267.5,510.3], [-268.1,504.5], [-304,401.2],
      [-320,353.4], [-322.8,338.7], [-323.3,326.2], [-322.8,311.5], [-320,297.8], [-314.9,280.5],
      [-306.9,265.8], [-298.3,252.7], [-286.4,239], [-273.3,229.5], [-255.6,218.5], [-159.3,158.7],
      [-119.9,134], [-111.4,125.7], [-104,115.7], [-97.8,107.3], [-92.6,95.7], [-88.6,85.8],
      [-78.3,57], [-71.5,47.5], [-62.9,36.5], [-51.6,29.2], [-42.4,24.4], [-19.7,15.5],
      [-2,6.6], [8.2,-1.3], [14.6,-9.1], [20.3,-19.7], [22.5,-32.3], [25.9,-53.8],
      [27.7,-67.5], [31,-82.6], [35.7,-93.6], [41.4,-104.2], [48.8,-114.7], [56.8,-124.1],
      [68.7,-134.6], [82.4,-144.6], [97.2,-153], [113.1,-159.7], [126.8,-163], [138.2,-163.4],
      [147.3,-163], [162.2,-158.7], [256.7,-115.2], [265.9,-111.5], [275.5,-111.5], [282.9,-114.7],
      [301.8,-126.2], [323.9,-144], [339.9,-160.3], [355.9,-181.8], [367.8,-195.9], [378.7,-204.4],
      [390.6,-209.6], [399.8,-211.7], [412.9,-211.7], [427.7,-207.5], [439.1,-201.3], [448.2,-192.2],
      [453.3,-186], [458.4,-178.1], [463,-169.2], [469.9,-161.9], [477.9,-158.7], [485.8,-158.7],
      [656.2,-196.5], [667,-200.2], [673.9,-203.8], [679,-208.6], [778.7,-329.7], [866.4,-435.8],
      [900,-478.8], [913.8,-503.9], [914.9,-510.3], [913.2,-516.1], [909.2,-519.2], [904.1,-522.9],
      [898.4,-524.4], [892.1,-524], [883.6,-521.9], [701.2,-463.5], [574.1,-427.9], [434,-393.9],
      [266.4,-360.2], [161.6,-342.9], [64.6,-328.7], [-220.8,-297.2], [-252.7,-291.4], [-256.7,-288.9],
      [-258.4,-283.6], [-257.9,-279.4], [-253.8,-273.6], [-235.1,-252.7], [-170.1,-163.4], [-141.6,-117.2],
      [-139.8,-110.4], [-141.6,-100.5], [-145.6,-93.6], [-153,-88.4], [-159.3,-86.8], [-171.2,-85.3],
      [-224.2,-89.5], [-229.4,-92.1], [-233.9,-96.3], [-238.4,-101.5], [-242.5,-108.9], [-253.3,-138.3],
      [-257.9,-149.8], [-265.3,-160.3], [-300,-195.9], [-305.1,-200.2], [-311.4,-202.8], [-317.7,-203.8],
      [-351.8,-206.9], [-358.7,-206.5], [-362.7,-203.8], [-366.7,-199.2], [-368.4,-192.8], [-366.1,-185.5],
      [-300,-71.6], [-273.3,-21.3], [-271,-7.6], [-271.5,6], [-273.8,17], [-276.6,28.1],
      [-284.1,48.5], [-294.4,71.1], [-301.2,80], [-312.6,88.4], [-325.6,94.7], [-379.8,119.3],
      [-390.6,122], [-401.4,122.6], [-421.3,121], [-440.2,118.3], [-458.4,112.5], [-478.3,104.6],
      [-496.1,94.2], [-508,85.3], [-516,71.7], [-578.1,-15.5], [-626.5,-76.4], [-632.8,-82.6],
      [-640.2,-85.8], [-649.9,-87.8], [-658.5,-87.4], [-670.4,-84.2], [-684.7,-79.5], [-696.6,-74.8],
      [-896.7,12.9], [-908,20.7], [-912.5,28.1], [-914.9,36], [-912.5,41.7], [-908,47],
      [-902.3,52.2], [-797.5,136.7],
    ],
    width: 38,
    // Famous T1 climb near start (~36 m rise), then gradual descent back
    elevation: [
      [0.00, 0], [0.02, 22], [0.05, 20], [0.10, 12], [0.20, 4],
      [0.35, 0], [0.55, -4], [0.70, -2], [0.85, 4], [0.95, 2], [1.00, 0],
    ],
  },
};

// Linearly interpolate an [[t, h], ...] keyframe table at normalized t.
function sampleElevation(profile, t) {
  if (!profile || profile.length === 0) return 0;
  if (t <= profile[0][0]) return profile[0][1];
  if (t >= profile[profile.length - 1][0]) return profile[profile.length - 1][1];
  for (let i = 0; i < profile.length - 1; i++) {
    const [t0, h0] = profile[i];
    const [t1, h1] = profile[i + 1];
    if (t >= t0 && t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return h0 + (h1 - h0) * k;
    }
  }
  return 0;
}

export class Track {
  constructor(layoutName) {
    const layout = TRACK_LAYOUTS[layoutName] || TRACK_LAYOUTS.Monaco;
    this.name = layoutName;
    this.width = layout.width;
    this.layout = layout;
    this.points = [];
    this.innerPoints = [];
    this.outerPoints = [];
    this.tangents = [];
    this.heights = []; // Y in world coords per centerline point
    this._buildCenterline(layout.points);
    this._buildHeights(layout);
    this._buildGrid();
    this.mesh = this._buildMesh();
  }

  _buildCenterline(rawCoords) {
    const raw = rawCoords.map(([rx, rz]) => ({
      x: rx * TRACK_SCALE,
      z: rz * TRACK_SCALE,
    }));

    const interp = [];
    const stepsPerSeg = 10;
    for (let i = 0; i < raw.length; i++) {
      const p0 = raw[(i - 1 + raw.length) % raw.length];
      const p1 = raw[i];
      const p2 = raw[(i + 1) % raw.length];
      const p3 = raw[(i + 2) % raw.length];
      for (let t = 0; t < stepsPerSeg; t++) {
        const s = t / stepsPerSeg;
        const s2 = s * s;
        const s3 = s2 * s;
        const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * s +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3);
        const z = 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * s +
          (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * s2 +
          (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * s3);
        interp.push({ x, z });
      }
    }

    const n = interp.length;
    for (let i = 0; i < n; i++) {
      const prev = interp[(i - 1 + n) % n];
      const next = interp[(i + 1) % n];
      const dx = next.x - prev.x;
      const dz = next.z - prev.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      const tx = dx / len;
      const tz = dz / len;
      const nx = -tz;
      const nz = tx;
      const c = interp[i];
      this.points.push({ x: c.x, z: c.z });
      this.tangents.push({ x: tx, z: tz });
      this.innerPoints.push({ x: c.x - nx * this.width, z: c.z - nz * this.width });
      this.outerPoints.push({ x: c.x + nx * this.width, z: c.z + nz * this.width });
    }
  }

  _buildHeights(layout) {
    const n = this.points.length;
    const profile = layout.elevation || [[0, 0], [1, 0]];
    for (let i = 0; i < n; i++) {
      const t = i / n;
      let h = sampleElevation(profile, t) * TRACK_SCALE;

      // Bridge lift for figure-8 crossovers (Suzuka)
      if (layout.bridgeSegments && layout.bridgeHeight) {
        for (const [b0, b1] of layout.bridgeSegments) {
          if (t >= b0 && t <= b1) {
            // Smooth S-curve blend in/out so ramps don't look like cliffs
            const mid = (b0 + b1) / 2;
            const half = (b1 - b0) / 2;
            const k = 1 - Math.min(Math.abs(t - mid) / half, 1);
            const ease = k * k * (3 - 2 * k);
            h += layout.bridgeHeight * TRACK_SCALE * ease;
          }
        }
      }

      this.heights.push(h);
    }

    // Smooth the heights with a rolling mean to hide any abrupt keyframe jumps
    const smooth = new Array(n);
    const R = 6;
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let k = -R; k <= R; k++) {
        sum += this.heights[(i + k + n) % n];
      }
      smooth[i] = sum / (R * 2 + 1);
    }
    this.heights = smooth;
  }

  // ─── Collision Grid ────────────────────────────────
  //
  // Each cell stores up to two segment indices. This is enough to represent
  // a figure-8 crossover: where two different parts of the track overlap,
  // both segments are recorded, and the car picks whichever is closer to its
  // current progress (so it cannot jump lanes at the intersection).

  _buildGrid() {
    const CELL = 5;
    this._cellSize = CELL;
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const p of this.points) {
      if (p.x < minX) minX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.x > maxX) maxX = p.x;
      if (p.z > maxZ) maxZ = p.z;
    }
    this._gridMinX = minX - this.width - CELL;
    this._gridMinZ = minZ - this.width - CELL;
    this._gridCols = Math.ceil((maxX - this._gridMinX + this.width + CELL) / CELL) + 1;
    this._gridRows = Math.ceil((maxZ - this._gridMinZ + this.width + CELL) / CELL) + 1;
    // 2 uint16 slots per cell. 0 = empty, otherwise segment_index + 1.
    this._grid = new Uint16Array(this._gridCols * this._gridRows * 2);

    const n = this.points.length;
    const w2 = this.width * this.width;
    // Two stored segments must be in *different* parts of the track to
    // represent an actual crossover, not merely two adjacent samples.
    const minSegGap = Math.max(20, Math.floor(n / 25));

    for (let row = 0; row < this._gridRows; row++) {
      const pz = this._gridMinZ + row * CELL;
      for (let col = 0; col < this._gridCols; col++) {
        const px = this._gridMinX + col * CELL;
        let best1 = Infinity, best2 = Infinity;
        let idx1 = -1, idx2 = -1;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          const d2 = this._distToSegmentSq(px, pz, this.points[i], this.points[j]);
          if (d2 >= w2) continue;
          if (d2 < best1) {
            // demote current #1 to #2 only if it is far enough from the new winner
            if (idx1 >= 0) {
              const gap = this._circDist(idx1, i, n);
              if (gap >= minSegGap && d2 < best2) {
                best2 = best1;
                idx2 = idx1;
              }
            }
            best1 = d2;
            idx1 = i;
          } else if (d2 < best2) {
            if (idx1 < 0 || this._circDist(idx1, i, n) >= minSegGap) {
              best2 = d2;
              idx2 = i;
            }
          }
        }
        const cell = (row * this._gridCols + col) * 2;
        this._grid[cell] = idx1 >= 0 ? idx1 + 1 : 0;
        this._grid[cell + 1] = idx2 >= 0 ? idx2 + 1 : 0;
      }
    }
  }

  _circDist(a, b, n) {
    const d = Math.abs(a - b);
    return Math.min(d, n - d);
  }

  _distToSegmentSq(px, pz, a, b) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lenSq = dx * dx + dz * dz;
    if (lenSq === 0) {
      const ex = px - a.x, ez = pz - a.z;
      return ex * ex + ez * ez;
    }
    let t = ((px - a.x) * dx + (pz - a.z) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + t * dx - px;
    const cz = a.z + t * dz - pz;
    return cx * cx + cz * cz;
  }

  _cellOf(x, z) {
    const col = Math.floor((x - this._gridMinX) / this._cellSize);
    const row = Math.floor((z - this._gridMinZ) / this._cellSize);
    if (col < 0 || col >= this._gridCols || row < 0 || row >= this._gridRows) return -1;
    return (row * this._gridCols + col) * 2;
  }

  // ─── Gameplay API ──────────────────────────────────

  getStartPos() {
    const p = this.points[0];
    const next = this.points[1];
    return {
      pos: { x: p.x, z: p.z, y: this.heights[0] },
      angle: Math.atan2(next.z - p.z, next.x - p.x),
    };
  }

  // Permissive boolean check — used by ray sensors where we just want
  // "is there pavement somewhere under this ray".
  isOnTrack(x, z) {
    const cell = this._cellOf(x, z);
    if (cell < 0) return false;
    return this._grid[cell] !== 0 || this._grid[cell + 1] !== 0;
  }

  // Strict check for car physics: returns the new progress index for a
  // car whose last known progress was `lastProgress`, or -1 if the car
  // is off-track or has drifted into a segment that is not contiguous
  // with where it was last frame (e.g. the wrong lane of a crossover).
  findProgressFromCar(x, z, lastProgress) {
    const cell = this._cellOf(x, z);
    if (cell < 0) return -1;
    const s1 = this._grid[cell] - 1;
    const s2 = this._grid[cell + 1] - 1;
    if (s1 < 0) return -1;
    const n = this.points.length;
    const window = Math.max(20, Math.floor(n * 0.06));
    const d1 = this._circDist(s1, lastProgress, n);
    if (s2 < 0) return d1 <= window ? s1 : -1;
    const d2 = this._circDist(s2, lastProgress, n);
    if (d1 <= d2) return d1 <= window ? s1 : (d2 <= window ? s2 : -1);
    return d2 <= window ? s2 : (d1 <= window ? s1 : -1);
  }

  castRay(x, z, angle) {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    for (let d = 0; d < SENSOR_LENGTH; d += 4) {
      if (!this.isOnTrack(x + cosA * d, z + sinA * d)) return d;
    }
    return SENSOR_LENGTH;
  }

  getHeightAtProgress(progress) {
    const n = this.heights.length;
    if (n === 0) return 0;
    const i = ((progress % n) + n) % n;
    return this.heights[Math.floor(i)];
  }

  // ─── 3D Mesh Build ─────────────────────────────────

  _buildMesh() {
    const group = new THREE.Group();
    const n = this.points.length;
    const yLift = 0.05;

    // Road surface — indexed BufferGeometry ribbon with per-vertex Y
    const roadPositions = new Float32Array(n * 2 * 3);
    const roadUVs = new Float32Array(n * 2 * 2);
    const roadNormals = new Float32Array(n * 2 * 3);
    for (let i = 0; i < n; i++) {
      const inn = this.innerPoints[i];
      const out = this.outerPoints[i];
      const y = this.heights[i] + yLift;
      roadPositions[i * 6 + 0] = inn.x;
      roadPositions[i * 6 + 1] = y;
      roadPositions[i * 6 + 2] = inn.z;
      roadPositions[i * 6 + 3] = out.x;
      roadPositions[i * 6 + 4] = y;
      roadPositions[i * 6 + 5] = out.z;
      roadUVs[i * 4 + 0] = 0;
      roadUVs[i * 4 + 1] = i / 6;
      roadUVs[i * 4 + 2] = 1;
      roadUVs[i * 4 + 3] = i / 6;
      roadNormals[i * 6 + 1] = 1;
      roadNormals[i * 6 + 4] = 1;
    }
    const roadIdx = [];
    for (let i = 0; i < n; i++) {
      const a = i * 2;
      const b = ((i + 1) % n) * 2;
      roadIdx.push(a, a + 1, b + 1);
      roadIdx.push(a, b + 1, b);
    }
    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.BufferAttribute(roadPositions, 3));
    roadGeo.setAttribute('normal', new THREE.BufferAttribute(roadNormals, 3));
    roadGeo.setAttribute('uv', new THREE.BufferAttribute(roadUVs, 2));
    roadGeo.setIndex(roadIdx);
    roadGeo.computeVertexNormals();

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a20,
      roughness: 0.85,
      metalness: 0.05,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.receiveShadow = true;
    group.add(road);

    // Center racing line (dashed white)
    const linePts = [];
    for (let i = 0; i < n; i += 2) {
      linePts.push(new THREE.Vector3(this.points[i].x, this.heights[i] + 0.12, this.points[i].z));
    }
    linePts.push(new THREE.Vector3(this.points[0].x, this.heights[0] + 0.12, this.points[0].z));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    const dashMat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 6,
      gapSize: 8,
      transparent: true,
      opacity: 0.32,
    });
    const centerLine = new THREE.Line(lineGeo, dashMat);
    centerLine.computeLineDistances();
    group.add(centerLine);

    // Kerbs (alternating red/white) — subsampled to a fixed stride so
    // density looks the same across tracks
    const kerbGeo = new THREE.BoxGeometry(5, 0.5, 7);
    const kerbRed = new THREE.MeshStandardMaterial({ color: 0xe8002d, roughness: 0.6 });
    const kerbWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
    const kerbStep = 6;
    const kerbCount = Math.floor(n / kerbStep);
    const kerbMeshInner = new THREE.InstancedMesh(kerbGeo, kerbRed, kerbCount);
    const kerbMeshOuter = new THREE.InstancedMesh(kerbGeo, kerbWhite, kerbCount);
    const dummy = new THREE.Object3D();
    for (let k = 0; k < kerbCount; k++) {
      const i = k * kerbStep;
      const t = this.tangents[i];
      const ang = Math.atan2(t.z, t.x);
      const y = this.heights[i] + 0.2;
      dummy.position.set(this.innerPoints[i].x, y, this.innerPoints[i].z);
      dummy.rotation.set(0, -ang, 0);
      dummy.updateMatrix();
      kerbMeshInner.setMatrixAt(k, dummy.matrix);
      dummy.position.set(this.outerPoints[i].x, y, this.outerPoints[i].z);
      dummy.rotation.set(0, -ang, 0);
      dummy.updateMatrix();
      kerbMeshOuter.setMatrixAt(k, dummy.matrix);
    }
    kerbMeshInner.instanceMatrix.needsUpdate = true;
    kerbMeshOuter.instanceMatrix.needsUpdate = true;
    kerbMeshInner.receiveShadow = true;
    kerbMeshOuter.receiveShadow = true;
    group.add(kerbMeshInner);
    group.add(kerbMeshOuter);

    // Support pillars for bridge sections (cosmetic)
    if (this.layout.bridgeSegments && this.layout.bridgeHeight) {
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.8 });
      for (const [b0, b1] of this.layout.bridgeSegments) {
        const i0 = Math.floor(b0 * n);
        const i1 = Math.floor(b1 * n);
        for (let i = i0; i <= i1; i += 12) {
          const h = this.heights[i];
          if (h < 3) continue;
          const p = this.points[i];
          const pillarGeo = new THREE.BoxGeometry(3, h + 2, 3);
          const pillar = new THREE.Mesh(pillarGeo, pillarMat);
          pillar.position.set(p.x, (h + 2) / 2 - 2, p.z);
          pillar.castShadow = true;
          group.add(pillar);
        }
      }
    }

    // Ground plane (grass) below track
    const groundGeo = new THREE.PlaneGeometry(14000, 14000, 1, 1);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f2814,
      roughness: 1,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    group.add(ground);

    // Start/finish line
    const startGeo = new THREE.PlaneGeometry(this.width * 2, 3);
    const startMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const startLine = new THREE.Mesh(startGeo, startMat);
    startLine.rotation.x = -Math.PI / 2;
    const sp = this.points[0];
    const st = this.tangents[0];
    startLine.position.set(sp.x, this.heights[0] + 0.15, sp.z);
    startLine.rotation.z = -Math.atan2(st.z, st.x);
    group.add(startLine);

    return group;
  }
}
