import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.split('className="flex items-center justify-between mb-4 pb-4 border-b ${appTheme === \'black\' ? \'border-[#4A4A52]\' : \'border-[#323238]/50\'}"').join('className={`flex items-center justify-between mb-4 pb-4 border-b ${appTheme === \'black\' ? \'border-[#4A4A52]\' : \'border-[#323238]/50\'}`}');
code = code.split('className="flex items-center justify-between pt-4 mt-2 border-t ${appTheme === \'black\' ? \'border-[#4A4A52]\' : \'border-[#323238]/50\'}"').join('className={`flex items-center justify-between pt-4 mt-2 border-t ${appTheme === \'black\' ? \'border-[#4A4A52]\' : \'border-[#323238]/50\'}`}');
code = code.split('className="pt-4 mt-2 border-t ${appTheme === \'black\' ? \'border-[#4A4A52]\' : \'border-[#323238]/50\'}"').join('className={`pt-4 mt-2 border-t ${appTheme === \'black\' ? \'border-[#4A4A52]\' : \'border-[#323238]/50\'}`}');
code = code.split('className="flex items-center justify-between pt-1 border-t ${appTheme === \'black\' ? \'border-[#4A4A52]\' : \'border-[#323238]/50\'} mt-2"').join('className={`flex items-center justify-between pt-1 border-t ${appTheme === \'black\' ? \'border-[#4A4A52]\' : \'border-[#323238]/50\'} mt-2`}');
code = code.split('className="pt-2 border-t ${appTheme === \'black\' ? \'border-[#4A4A52]\' : \'border-[#323238]/50\'} space-y-4"').join('className={`pt-2 border-t ${appTheme === \'black\' ? \'border-[#4A4A52]\' : \'border-[#323238]/50\'} space-y-4`}');
code = code.split('className="mt-1 mb-2 px-1 flex items-center justify-between border-b ${appTheme === \'black\' ? \'border-[#4A4A52]\' : \'border-[#323238]/50\'} pb-2"').join('className={`mt-1 mb-2 px-1 flex items-center justify-between border-b ${appTheme === \'black\' ? \'border-[#4A4A52]\' : \'border-[#323238]/50\'} pb-2`}');

fs.writeFileSync('src/App.tsx', code);
