let canvas;
let canvasCtx;
let audioCtx;
let fundamental;
let lockView;
let zoom;
let volume;
let circleTable;
const circles = [];
const trail = [];
const PI2 = Math.PI * 2;
const requestFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(e) { return window.setTimeout(e, 1000 / 60); };

function setup() {
	circleTable = document.getElementById("circleTable");
	canvas = document.getElementById("canvas");
	canvasCtx = canvas.getContext("2d");
	fundamental = parseFloat(document.getElementById("frequency").value);
	lockView = document.getElementById("lockX").checked;
	zoom = parseFloat(document.getElementById("zoom").value);
	volume = parseFloat(document.getElementById("volume").value);
	requestFrame(draw);
}

function createContext() {
	if (audioCtx) return;
	audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	const processor = audioCtx.createScriptProcessor(1024, 1, 1);
	const step = Math.PI / audioCtx.sampleRate;
	processor.onaudioprocess = function(e) {
		const output = e.outputBuffer.getChannelData(0);
		for (let i = 0; i < output.length; i++) {
			let sample = 0;
			for (let j = 0; j < circles.length; j++) {
				const circle = circles[j];
				// Calculate absolute speed from relative speed
				const absoluteSpeed = fundamental * circle.speed;
				// Perform additive synthesis
				sample += Math.cos(circle.phase * absoluteSpeed) * circle.radius;
				// Modulo 0 or NaN crashes JavaScript
				circle.phase = (circle.phase + step) % ((PI2 / absoluteSpeed) || PI2);
			}
			output[i] = sample * volume;
		}
	};
	processor.connect(audioCtx.destination);
}

function addCircle() {
	createContext();
	const speed = Math.floor(circles.length / 2) + 1;
	const circle = {
		radius: 0.1,
		speed: circles.length % 2 == 0 ? speed : -speed,
		// Use the phase of the first circle if it exists
		phase: circles.length > 0 ? circles[0].phase : 0
	};
	circles.push(circle);
	updateTable(circle);
}

function addHarmonic() {
	addCircle();
	addCircle();
}

function updateTable(circle) {
	circleTable.style.display = "inline-table";
	const row = circleTable.insertRow(-1);
	// Add radius controller to table
	const radiusCell = row.insertCell(-1);
	const radiusInput = document.createElement("input");
	radiusInput.type = "number";
	radiusInput.step = "0.1";
	radiusInput.value = circle.radius;
	radiusInput.addEventListener("input", function(e) {
		circle.radius = parseFloat(e.target.value);
	});
	radiusCell.appendChild(radiusInput);
	// Add speed controller to table
	const speedCell = row.insertCell(-1);
	const speedInput = document.createElement("input");
	speedInput.type = "number";
	speedInput.step = "0.1";
	speedInput.value = circle.speed;
	speedInput.addEventListener("input", function(e) {
		circle.speed = parseFloat(e.target.value);
	});
	speedCell.appendChild(speedInput);
	// Add delete button
	const deleteCell = row.insertCell(-1);
	const deleteButton = document.createElement("input");
	deleteButton.type = "button";
	deleteButton.value = "Remove";
	deleteButton.addEventListener("click", function(e) {
		// Remove displayed row
		circleTable.deleteRow(row.rowIndex);
		// Remove from circles array
		const index = circles.indexOf(circle);
		if (index !== -1) {
			circles.splice(index, 1);
		}
		// Hide table if required
		if (circles.length <= 0) {
			circleTable.style.display = "none";
		}
	});
	deleteCell.appendChild(deleteButton);
}

function degreesToRadians(degrees) {
	return degrees * Math.PI / 180;
}

function draw() {
	canvasCtx.fillStyle = "black";
	canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
	if (audioCtx && circles.length) {
		// Draw circles and lines
		let xPos = canvas.width / 2;
		let yPos = canvas.height / 2;
		for (let i = 0; i < circles.length; i++) {
			const circle = circles[i];
			// Angle is much slower than reality
			const angle = degreesToRadians(audioCtx.currentTime * fundamental * circle.speed);
			const radiusPixels = circle.radius * zoom;
			// Draw circle
			canvasCtx.strokeStyle = "gray";
			canvasCtx.lineWidth = 2;
			canvasCtx.beginPath();
			canvasCtx.arc(xPos, yPos, Math.abs(radiusPixels), 0, PI2);
			canvasCtx.stroke();
			// Draw line
			canvasCtx.strokeStyle = "white";
			canvasCtx.lineWidth = 4;
			canvasCtx.beginPath();
			canvasCtx.moveTo(xPos, yPos);
			// Based on math from https://wiki.facepunch.com/gmod/surface.DrawPoly
			xPos += Math.sin(angle) * radiusPixels;
			// Subtracting because the coordinate system is different compared to audio
			yPos -= Math.cos(angle) * radiusPixels;
			canvasCtx.lineTo(xPos, yPos);
			canvasCtx.stroke();
		}
		// Draw trail (lazily)
		canvasCtx.strokeStyle = "red";
		canvasCtx.lineWidth = 4;
		canvasCtx.beginPath();
		const xCoord = lockView ? canvas.width / 2 : xPos;
		for (let j = 0; j < trail.length; j++) {
			canvasCtx.lineTo(xCoord - (trail.length - j), trail[j]);
		}
		canvasCtx.stroke();
		// Trail acts as a lazy circular buffer
		if (trail.length > canvas.width) {
			trail.shift();
		}
		trail.push(yPos);
	}
	requestFrame(draw);
}

function changeFundamental(elem) {
	fundamental = parseFloat(elem.value);
}

function lockX(elem) {
	lockView = elem.checked;
}

function changeZoom(elem) {
	zoom = parseFloat(elem.value);
}

function changeVolume(elem) {
	volume = parseFloat(elem.value);
}