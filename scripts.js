
        // DOM Elements
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const placeholder = document.getElementById('placeholder');
        const countdown = document.getElementById('countdown');
        const startBtn = document.getElementById('start-btn');
        const processBtn = document.getElementById('process-btn');
        const downloadBtn = document.getElementById('download-btn');
        const newSessionBtn = document.getElementById('new-session-btn');
        const statusEl = document.getElementById('status');
        const progressText = document.getElementById('progress-text');
        const progressFill = document.getElementById('progress-fill');
        const filterOptions = document.querySelectorAll('.filter-option');
        const cameraSection = document.getElementById('camera-section');
        const filterSection = document.getElementById('filter-section');
        const resultSection = document.getElementById('result-section');
        const stripCanvas = document.getElementById('strip-canvas');
        const stripCtx = stripCanvas.getContext('2d');
        
        // App State
        let stream = null;
        let photos = [];
        let selectedFilter = 'sepia';
        let photoCount = 0;
        let audioContext = null;
        
        // Initialize
        function init() {
            setupEventListeners();
            // Initialize audio context on first user interaction
            document.addEventListener('click', initAudio, { once: true });
        }
        
        // Initialize Web Audio API
        function initAudio() {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Play vintage camera shutter sound
        function playShutterSound() {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const now = audioContext.currentTime;
            
            // Create a cute vintage click sound
            // First click - mechanical sound
            const clickOsc = audioContext.createOscillator();
            const clickGain = audioContext.createGain();
            clickOsc.type = 'square';
            clickOsc.frequency.setValueAtTime(800, now);
            clickOsc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
            clickGain.gain.setValueAtTime(0.3, now);
            clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
            clickOsc.connect(clickGain);
            clickGain.connect(audioContext.destination);
            clickOsc.start(now);
            clickOsc.stop(now + 0.03);
            
            // Second part - shutter release
            const shutterOsc = audioContext.createOscillator();
            const shutterGain = audioContext.createGain();
            shutterOsc.type = 'triangle';
            shutterOsc.frequency.setValueAtTime(1200, now + 0.03);
            shutterOsc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
            shutterGain.gain.setValueAtTime(0.2, now + 0.03);
            shutterGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
            shutterOsc.connect(shutterGain);
            shutterGain.connect(audioContext.destination);
            shutterOsc.start(now + 0.03);
            shutterOsc.stop(now + 0.08);
            
            // Soft chime - cute ending
            const chimeOsc = audioContext.createOscillator();
            const chimeGain = audioContext.createGain();
            chimeOsc.type = 'sine';
            chimeOsc.frequency.setValueAtTime(1400, now + 0.1);
            chimeOsc.frequency.setValueAtTime(1800, now + 0.15);
            chimeGain.gain.setValueAtTime(0.15, now + 0.1);
            chimeGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            chimeOsc.connect(chimeGain);
            chimeGain.connect(audioContext.destination);
            chimeOsc.start(now + 0.1);
            chimeOsc.stop(now + 0.25);
        }
        
        // Event Listeners
        function setupEventListeners() {
            startBtn.addEventListener('click', startSession);
            processBtn.addEventListener('click', createStrip);
            downloadBtn.addEventListener('click', downloadStrip);
            newSessionBtn.addEventListener('click', resetApp);
            
            filterOptions.forEach(option => {
                option.addEventListener('click', () => {
                    filterOptions.forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                    selectedFilter = option.dataset.filter;
                });
            });
        }
        
        // Start photo session
        async function startSession() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                await video.play(); // Start playing the video stream
                video.classList.remove('hidden');
                placeholder.classList.add('hidden');
                
                statusEl.textContent = 'Get ready for your first photo!';
                startBtn.disabled = true;
                
                // Start taking photos after a delay
                setTimeout(takePhotos, 3000);
            } catch (err) {
                console.error('Error accessing camera:', err);
                statusEl.textContent = 'Camera error. Please check permissions.';
            }
        }
        
        // Take 3 photos with countdown
        async function takePhotos() {
            for (let i = 0; i < 3; i++) {
                await takePhoto();
                photoCount++;
                updateProgress();
                
                if (i < 2) { // Wait between photos except after the last one
                    statusEl.textContent = `Photo ${photoCount} taken! Get ready for next...`;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            // Stop camera after all photos taken
            stopCamera();
            statusEl.textContent = 'All photos taken! Choose your filter.';
            filterSection.classList.remove('hidden');
        }
        
        // Take a single photo
        function takePhoto() {
            return new Promise(resolve => {
                const flash = document.getElementById('flash');
                
                // Show countdown
                let count = 3;
                countdown.textContent = count;
                countdown.classList.remove('hidden');
                
                const countdownInterval = setInterval(() => {
                    count--;
                    countdown.textContent = count;
                    if (count <= 0) {
                        clearInterval(countdownInterval);
                        countdown.classList.add('hidden');
                        
                        // Play shutter sound
                        playShutterSound();
                        
                        // Flash effect
                        flash.style.opacity = '0.9';
                        setTimeout(() => {
                            flash.style.opacity = '0';
                        }, 150);
                        
                        // Capture photo
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        // Flip the canvas horizontally to un-mirror the image
                        ctx.translate(canvas.width, 0);
                        ctx.scale(-1, 1);
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        photos.push(canvas.toDataURL('image/png'));
                        
                        resolve();
                    }
                }, 1000);
            });
        }
        
        // Update progress bar
        function updateProgress() {
            progressText.textContent = `${photoCount}/3`;
            progressFill.style.width = `${(photoCount / 3) * 100}%`;
        }
        
        // Stop camera
        function stopCamera() {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
            video.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }
        
        // Create photo strip
        function createStrip() {
            filterSection.classList.add('hidden');
            statusEl.textContent = 'Creating your vintage memory strip...';
            
            // Set strip dimensions (3 photos vertically) with generous padding so borders stay visible
            const photoWidth = 380;
            const photoHeight = 280;
            const paddingX = 30;
            const paddingTop = 70;
            const paddingBottom = 70;
            const gapY = 30;
            stripCanvas.width = photoWidth + paddingX * 2;
            stripCanvas.height = paddingTop + paddingBottom + (photoHeight * 3) + (gapY * 2);
            
            // Clear canvas - black and white strip background
            stripCtx.fillStyle = '#1a1a1a'; // Dark gray/black background
            stripCtx.fillRect(0, 0, stripCanvas.width, stripCanvas.height);
            
            // Add white border around entire strip
            stripCtx.strokeStyle = '#ffffff';
            stripCtx.lineWidth = 4;
            stripCtx.strokeRect(2, 2, stripCanvas.width - 4, stripCanvas.height - 4);
            
            // Draw title in white
            stripCtx.font = 'bold 24px "Playfair Display", serif';
            stripCtx.fillStyle = '#ffffff';
            stripCtx.textAlign = 'center';
            stripCtx.fillText('Memory Booth', stripCanvas.width / 2, 38);
            
            // Draw date in light gray
            stripCtx.font = '16px "Raleway", sans-serif';
            stripCtx.fillStyle = '#d0d0d0';
            stripCtx.fillText(new Date().toLocaleDateString(), stripCanvas.width / 2, 62);
            
            // Draw photos
            let yPos = paddingTop;
            photos.forEach((photoData, index) => {
                const img = new Image();
                img.onload = function() {
                    // Apply filter effect
                    stripCtx.save();
                    stripCtx.filter = getFilterStyle(selectedFilter);
                    stripCtx.drawImage(img, paddingX, yPos, photoWidth, photoHeight);
                    stripCtx.restore();
                    
                    // Add photo number in white
                    stripCtx.font = '16px "Raleway", sans-serif';
                    stripCtx.fillStyle = '#ffffff';
                    stripCtx.textAlign = 'right';
                    stripCtx.fillText(`#${index + 1}`, stripCanvas.width - 18, yPos + 22);
                    
                    // Move down for next photo
                    yPos += photoHeight + gapY;
                    
                    // When all photos are drawn
                    if (index === photos.length - 1) {
                        statusEl.textContent = 'Your vintage memory strip is ready!';
                        resultSection.classList.remove('hidden');
                    }
                };
                img.src = photoData;
            });
        }
        
        // Get CSS filter based on selection
        function getFilterStyle(filter) {
            switch(filter) {
                case 'bw':
                    return 'grayscale(100%) contrast(120%)';
                case 'sepia':
                    return 'sepia(80%) contrast(110%) brightness(90%)';
                case 'grainy':
                    return 'contrast(100%) brightness(80%) saturate(120%)';
                default:
                    return 'none'; // Color
            }
        }
        
        // Download strip as PNG
        function downloadStrip() {
            const link = document.createElement('a');
            link.download = 'memory-booth-strip.png';
            link.href = stripCanvas.toDataURL('image/png');
            link.click();
        }
        
        // Reset app for new session
        function resetApp() {
            // Reset state
            photos = [];
            photoCount = 0;
            selectedFilter = 'sepia';
            
            // Reset UI
            updateProgress();
            filterOptions.forEach(opt => opt.classList.remove('selected'));
            document.querySelector('[data-filter="sepia"]').classList.add('selected');
            resultSection.classList.add('hidden');
            filterSection.classList.add('hidden');
            startBtn.disabled = false;
            statusEl.textContent = 'Ready to begin';
        }
        
        // Initialize app when page loads
        window.addEventListener('DOMContentLoaded', init);
  