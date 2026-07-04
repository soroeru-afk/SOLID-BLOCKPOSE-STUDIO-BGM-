import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.split("className={`w-5 h-5  border border-gray-500 bg-[#1a1a1e] flex items-center justify-center transition-colors ${isAdvancedOptionsOpen ? highlightClasses.border : 'group-hover:border-gray-500'}`}").join("className={`w-5 h-5 border flex items-center justify-center transition-colors ${appTheme === 'light' ? 'bg-white border-gray-200' : 'bg-[#1a1a1e] border-gray-500'} ${isAdvancedOptionsOpen ? highlightClasses.border : (appTheme === 'light' ? 'group-hover:border-gray-400' : 'group-hover:border-gray-500')}`}");

fs.writeFileSync('src/App.tsx', code);
