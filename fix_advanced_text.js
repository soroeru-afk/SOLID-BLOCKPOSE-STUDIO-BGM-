import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.split("className={`text-[10px] font-black tracking-widest uppercase transition-colors ${isAdvancedOptionsOpen ? 'text-[#E1E1E6]' : 'text-gray-500 group-hover:text-gray-300'}`}").join("className={`text-[10px] font-black tracking-widest uppercase transition-colors ${isAdvancedOptionsOpen ? (appTheme === 'light' ? 'text-gray-800' : 'text-[#E1E1E6]') : (appTheme === 'light' ? 'text-gray-500 group-hover:text-gray-600' : 'text-gray-500 group-hover:text-gray-300')}`}");

fs.writeFileSync('src/App.tsx', code);
