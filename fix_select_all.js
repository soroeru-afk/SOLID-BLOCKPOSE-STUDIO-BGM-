import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.split("? 'bg-[var(--accent)] border-[var(--accent)]'").join("? 'bg-[#323238] border-gray-500'");
code = code.split("{playlists.find(p => p.id === activePlaylistId)?.trackIds.length > 0 && playlists.find(p => p.id === activePlaylistId)?.trackIds.every(id => selectedTrackIds.has(id)) && <Check className=\"w-2.5 h-2.5 text-black\" />}").join("{playlists.find(p => p.id === activePlaylistId)?.trackIds.length > 0 && playlists.find(p => p.id === activePlaylistId)?.trackIds.every(id => selectedTrackIds.has(id)) && <Check className=\"w-2.5 h-2.5 text-white\" />}");

fs.writeFileSync('src/App.tsx', code);
