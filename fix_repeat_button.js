import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.split("'bg-[#1a1a1e] border-[#323238] text-gray-400 hover:text-white hover:bg-[#323238]'").join("'border-gray-500 bg-[#1a1a1e] hover:bg-[#323238] text-gray-400 hover:text-white'");

fs.writeFileSync('src/App.tsx', code);
