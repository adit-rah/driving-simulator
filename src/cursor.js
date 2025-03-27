// this runs in sync with the server
// I shouldn't deal with a trivial detail like this early into
// development, especially with a lot to work with in the future

// I just wanted to flag this as something that may be a concern further
// down the line. 

let crosshairState = false; 

function toggleCrosshair() {
    const crosshair = document.getElementById('crosshair');
    crosshair.style.display = crosshairState ? 'none' : 'block';
    crosshairState = crosshairState ? false : true; 
}

// Listen for the toggle key press to toggle the crosshair,
window.addEventListener('keydown', (event) => {
if (event.key === 'c' || event.key === 'C') { // it's c in this case
    toggleCrosshair();
}
});