// Initialize Debug Flags
export let ISDEBUGMODE = true;
let flags = {}; 
let debugMenu = null; // To store the debug menu element

// Function to create or update the debug menu
function createDebugMenu() {
  if (!debugMenu) {
    debugMenu = document.createElement('div');
    debugMenu.className = 'debug-menu';
    document.body.appendChild(debugMenu);
  }

  // Clear the existing content of the menu
  debugMenu.innerHTML = '<h3>Debug Menu</h3>';

  // Loop through flags and display them
  for (const [key, value] of Object.entries(flags)) {
    const flagElement = document.createElement('div');
    flagElement.innerHTML = `<strong>${key}:</strong> <span id="${key}-flag">${value ? 'ON' : 'OFF'}</span>`;
    debugMenu.appendChild(flagElement);
  }
}

// Function to update flags and refresh the debug menu
export function updateFlags(newFlags) {
  for (const [key, value] of Object.entries(newFlags)) {
    flags[key] = value; 
    if (value) console.log(`${key} is enabled!`);
  }
  
  // Update the debug menu after updating flags
  if (ISDEBUGMODE) {
    createDebugMenu(); // Ensure the debug menu is created
    for (const [key, value] of Object.entries(newFlags)) {
      const flagElement = document.getElementById(`${key}-flag`);
      if (flagElement) {
        flagElement.textContent = value ? 'ON' : 'OFF';
      }
    }
  }
}
