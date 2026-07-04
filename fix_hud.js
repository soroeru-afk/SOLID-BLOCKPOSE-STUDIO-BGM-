import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.split('className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-[#1E1E22]/70 backdrop-blur-sm border ${appTheme === \'black\' ? \'border-[#4A4A52]\' : \'border-[#323238]\'} shadow-xl pointer-events-none scale-90 opacity-70 origin-bottom"').join('className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-[#1E1E22]/70 backdrop-blur-sm border ${appTheme === \'black\' ? \'border-[#4A4A52]\' : \'border-[#323238]\'} shadow-xl pointer-events-none scale-90 opacity-70 origin-bottom`}');

fs.writeFileSync('src/App.tsx', code);
