#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const envFiles = {
  local: '.env.local',
  prod: '.env.prod',
  active: '.env.local.active'
};

// Sprawdź system operacyjny
const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

// Funkcja do kopiowania plików cross-platform
function copyFileCrossPlatform(source, target) {
  try {
    if (isWindows) {
      // Windows - użyj copy
      execSync(`copy "${source}" "${target}"`, { stdio: 'inherit' });
    } else {
      // Mac/Linux - użyj cp
      execSync(`cp "${source}" "${target}"`, { stdio: 'inherit' });
    }
    return true;
  } catch (error) {
    console.error(`❌ Błąd podczas kopiowania: ${error.message}`);
    return false;
  }
}

function switchEnvironment(env) {
  const sourceFile = envFiles[env];
  const targetFile = envFiles.active;
  
  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Plik ${sourceFile} nie istnieje!`);
    process.exit(1);
  }
  
  console.log(`🔄 Przełączam na środowisko: ${env.toUpperCase()}`);
  console.log(`💻 System: ${isWindows ? 'Windows' : isMac ? 'macOS' : 'Linux'}`);
  
  // Kopiuj plik środowiskowy
  if (copyFileCrossPlatform(sourceFile, targetFile)) {
    console.log(`✅ Przełączono na środowisko: ${env.toUpperCase()}`);
    console.log(`📁 Skopiowano ${sourceFile} → ${targetFile}`);
    
    // Pokaż zawartość aktywnego pliku
    try {
      const content = fs.readFileSync(targetFile, 'utf8');
      console.log('\n📋 Zawartość aktywnego pliku:');
      console.log('─'.repeat(50));
      console.log(content);
      console.log('─'.repeat(50));
    } catch (error) {
      console.log('⚠️  Nie udało się odczytać zawartości pliku');
    }
  } else {
    console.error('❌ Nie udało się przełączyć środowiska');
    process.exit(1);
  }
}

function showStatus() {
  const activeFile = envFiles.active;
  
  if (fs.existsSync(activeFile)) {
    try {
      const content = fs.readFileSync(activeFile, 'utf8');
      const envType = content.includes('127.0.0.1:54321') ? 'LOKALNE' : 'PRODUKCYJNE';
      
      console.log(`🌍 Aktywne środowisko: ${envType}`);
      console.log(`📁 Plik: ${activeFile}`);
      console.log(`💻 System: ${isWindows ? 'Windows' : isMac ? 'macOS' : 'Linux'}`);
      console.log('\n📋 Zawartość:');
      console.log('─'.repeat(50));
      console.log(content);
      console.log('─'.repeat(50));
    } catch (error) {
      console.log('⚠️  Nie udało się odczytać zawartości pliku');
    }
  } else {
    console.log('❌ Brak aktywnego pliku środowiskowego');
    console.log('💡 Użyj: npm run env:local lub npm run env:prod');
  }
}

function showSystemInfo() {
  console.log('💻 Informacje o systemie:');
  console.log(`   Platforma: ${os.platform()}`);
  console.log(`   Architektura: ${os.arch()}`);
  console.log(`   Wersja: ${os.release()}`);
  console.log(`   Typ: ${isWindows ? 'Windows' : isMac ? 'macOS' : 'Linux'}`);
  console.log(`   Komenda kopiowania: ${isWindows ? 'copy' : 'cp'}`);
}

// Główna logika
const command = process.argv[2];

switch (command) {
  case 'local':
    switchEnvironment('local');
    break;
  case 'prod':
    switchEnvironment('prod');
    break;
  case 'status':
    showStatus();
    break;
  case 'info':
    showSystemInfo();
    break;
  default:
    console.log('🔄 Uniwersalny skrypt przełączania środowisk');
    console.log(`💻 System: ${isWindows ? 'Windows' : isMac ? 'macOS' : 'Linux'}`);
    console.log(`📋 Komenda kopiowania: ${isWindows ? 'copy' : 'cp'}`);
    console.log('\n📖 Użycie:');
    console.log('  node scripts/switch-env.js local    # Przełącz na lokalne');
    console.log('  node scripts/switch-env.js prod     # Przełącz na produkcję');
    console.log('  node scripts/switch-env.js status   # Pokaż status');
    console.log('  node scripts/switch-env.js info     # Informacje o systemie');
    console.log('\n🚀 Lub użyj skryptów npm:');
    console.log('  npm run env:local                   # Przełącz na lokalne');
    console.log('  npm run env:prod                    # Przełącz na produkcję');
    console.log('  npm run env:status                  # Pokaż status');
    console.log('\n🌐 Development:');
    console.log('  npm run dev:local                   # Dev z lokalną bazą');
    console.log('  npm run dev:prod                    # Dev z zdalną bazą');
    console.log('\n🔧 Ręczne kopiowanie:');
    if (isWindows) {
      console.log('  copy .env.local .env.local.active  # Windows');
      console.log('  copy .env.prod .env.local.active   # Windows');
    } else {
      console.log('  cp .env.local .env.local.active    # Mac/Linux');
      console.log('  cp .env.prod .env.local.active     # Mac/Linux');
    }
}
