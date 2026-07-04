import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Update background of the advanced options block
code = code.split('className="-mx-2 px-2 py-3 bg-[#1a1a1e]/60 border border-[#323238]  space-y-4"').join('className={`-mx-2 px-2 py-3 border space-y-4 ${appTheme === \'light\' ? \'bg-gray-100/50 border-gray-200\' : (appTheme === \'black\' ? \'bg-[#1a1a1e]/40 border-[#4A4A52]\' : \'bg-[#1a1a1e]/60 border-[#323238]\')}`}');

// Update text colors
code = code.split('className="text-[10px] uppercase font-bold text-gray-400 tracking-wider"').join('className={`text-[10px] uppercase font-bold tracking-wider ${appTheme === \'light\' ? \'text-gray-600\' : \'text-gray-400\'}`}');

// Update toggle buttons for Auto Format Change and Random Format Change
code = code.split("className={`w-10 h-5  transition-colors relative border ${isAutoFormation ? 'bg-transparent border-amber-500' : 'border-gray-500 bg-[#1a1a1e]'}`}").join("className={`w-10 h-5  transition-colors relative border ${isAutoFormation ? 'bg-transparent border-amber-500' : (appTheme === 'light' ? 'border-gray-300 bg-gray-200' : 'border-gray-500 bg-[#1a1a1e]')}`}").split("className={`absolute top-[1px] w-4 h-4  transition-all ${isAutoFormation ? 'bg-amber-500 right-[1px]' : 'bg-gray-500 left-[1px]'}`}").join("className={`absolute top-[1px] w-4 h-4  transition-all ${isAutoFormation ? 'bg-amber-500 right-[1px]' : (appTheme === 'light' ? 'bg-white left-[1px] shadow-sm' : 'bg-gray-500 left-[1px]')}`}");

code = code.split("className={`w-10 h-5  transition-colors relative border ${isRandomFormation ? 'bg-transparent border-amber-500' : 'border-gray-500 bg-[#1a1a1e]'}`}").join("className={`w-10 h-5  transition-colors relative border ${isRandomFormation ? 'bg-transparent border-amber-500' : (appTheme === 'light' ? 'border-gray-300 bg-gray-200' : 'border-gray-500 bg-[#1a1a1e]')}`}").split("className={`absolute top-[1px] w-4 h-4  transition-all ${isRandomFormation ? 'bg-amber-500 right-[1px]' : 'bg-gray-500 left-[1px]'}`}").join("className={`absolute top-[1px] w-4 h-4  transition-all ${isRandomFormation ? 'bg-amber-500 right-[1px]' : (appTheme === 'light' ? 'bg-white left-[1px] shadow-sm' : 'bg-gray-500 left-[1px]')}`}");

// Cinematic View toggle
code = code.split("className={`w-10 h-5  transition-colors relative border ${isAutoCamera ? 'bg-transparent border-red-500' : 'border-gray-500 bg-[#1a1a1e]'}`}").join("className={`w-10 h-5  transition-colors relative border ${isAutoCamera ? 'bg-transparent border-red-500' : (appTheme === 'light' ? 'border-gray-300 bg-gray-200' : 'border-gray-500 bg-[#1a1a1e]')}`}").split("className={`absolute top-[1px] w-4 h-4  transition-all ${isAutoCamera ? 'bg-red-500 right-[1px]' : 'bg-gray-500 left-[1px]'}`}").join("className={`absolute top-[1px] w-4 h-4  transition-all ${isAutoCamera ? 'bg-red-500 right-[1px]' : (appTheme === 'light' ? 'bg-white left-[1px] shadow-sm' : 'bg-gray-500 left-[1px]')}`}");

// Slider bg
code = code.split('className="w-full h-1 bg-gray-700  appearance-none cursor-pointer accent-red-500"').join('className={`w-full h-1 appearance-none cursor-pointer accent-red-500 ${appTheme === \'light\' ? \'bg-gray-300\' : \'bg-gray-700\'}`}');

fs.writeFileSync('src/App.tsx', code);
