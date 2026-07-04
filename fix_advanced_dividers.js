import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.split("className={`flex items-center justify-between pt-1 border-t ${appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50'} mt-2`}").join("className={`flex items-center justify-between pt-1 border-t ${appTheme === 'light' ? 'border-gray-200' : (appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50')} mt-2`}");

code = code.split("className={`pt-2 border-t ${appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50'} space-y-4`}").join("className={`pt-2 border-t ${appTheme === 'light' ? 'border-gray-200' : (appTheme === 'black' ? 'border-[#222225]' : 'border-[#323238]/50')} space-y-4`}");

fs.writeFileSync('src/App.tsx', code);
