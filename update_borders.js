import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Update visual panel divider lines to be barely visible in black theme
code = code.split("appTheme === 'black' ? 'border-[#4A4A52]' : 'border-[#323238]/50'").join("appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50'");

// Update Playlist buttons border
code = code.split(`className="flex-1 bg-[#1a1a1e] hover:bg-[#323238] text-[var(--accent)] text-[10px] font-bold uppercase py-1.5 px-3  border border-[#323238] transition-colors flex items-center justify-center gap-1.5"`).join(`className={\`flex-1 bg-[#1a1a1e] hover:bg-[#323238] text-[var(--accent)] text-[10px] font-bold uppercase py-1.5 px-3  border \${appTheme === 'black' ? 'border-[#4A4A52]' : 'border-[#323238]'} transition-colors flex items-center justify-center gap-1.5\`}`);

code = code.split(`className="w-8 flex items-center justify-center  border transition-colors bg-[#1a1a1e] border-[#323238] text-gray-500 hover:text-gray-300"`).join(`className={\`w-8 flex items-center justify-center  border transition-colors bg-[#1a1a1e] \${appTheme === 'black' ? 'border-[#4A4A52]' : 'border-[#323238]'} text-gray-500 hover:text-gray-300\`}`);

code = code.split(`className="w-8 flex items-center justify-center  border transition-colors bg-[#1a1a1e] hover:bg-red-500/10 text-gray-500 hover:text-red-400 border-[#323238]"`).join(`className={\`w-8 flex items-center justify-center  border transition-colors bg-[#1a1a1e] hover:bg-red-500/10 text-gray-500 hover:text-red-400 \${appTheme === 'black' ? 'border-[#4A4A52]' : 'border-[#323238]'}\`}`);

fs.writeFileSync('src/App.tsx', code);
