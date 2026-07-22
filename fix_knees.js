import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "{ id: 'head', name: 'Head Turn', axis: 0 },\n                      { id: 'arm_l_upper', name: 'L-Arm Upper', axis: 0 },",
  "{ id: 'head', name: 'Head Turn', axis: 0 },\n                      { id: 'arm_l_upper', name: 'L-Arm Upper', axis: 0 },\n                      { id: 'arm_l_lower', name: 'L-Elbow', axis: 0 },"
);
code = code.replace(
  "{ id: 'arm_l_upper', name: 'L-Arm Spread', axis: 2 },\n                      { id: 'arm_r_upper', name: 'R-Arm Upper', axis: 0 },",
  "{ id: 'arm_l_upper', name: 'L-Arm Spread', axis: 2 },\n                      { id: 'arm_r_upper', name: 'R-Arm Upper', axis: 0 },\n                      { id: 'arm_r_lower', name: 'R-Elbow', axis: 0 },"
);
code = code.replace(
  "{ id: 'arm_r_upper', name: 'R-Arm Spread', axis: 2 },\n                      { id: 'leg_l_upper', name: 'L-Leg Upper', axis: 0 },",
  "{ id: 'arm_r_upper', name: 'R-Arm Spread', axis: 2 },\n                      { id: 'leg_l_upper', name: 'L-Leg Upper', axis: 0 },\n                      { id: 'leg_l_lower', name: 'L-Knee', axis: 0 },"
);
code = code.replace(
  "{ id: 'leg_l_upper', name: 'L-Leg Spread', axis: 2 },\n                      { id: 'leg_r_upper', name: 'R-Leg Upper', axis: 0 },",
  "{ id: 'leg_l_upper', name: 'L-Leg Spread', axis: 2 },\n                      { id: 'leg_r_upper', name: 'R-Leg Upper', axis: 0 },\n                      { id: 'leg_r_lower', name: 'R-Knee', axis: 0 },"
);

fs.writeFileSync('src/App.tsx', code);
