// 8-bit Sound Manager using Web Audio API
class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.15; // 50% quieter

        // Initialize on first user interaction (browser requirement)
        this.init();
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // Resume audio context (needed after user interaction)
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Create oscillator with envelope
    createTone(frequency, type, duration, attack = 0.01, decay = 0.1) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type; // sine, square, sawtooth, triangle
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + attack);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }

    // Player shoot - short high beep
    playerShoot() {
        this.createTone(880, 'square', 0.08);
        setTimeout(() => this.createTone(660, 'square', 0.05), 20);
    }

    // Enemy shoot - lower pitched
    enemyShoot() {
        this.createTone(220, 'sawtooth', 0.1);
    }

    // Player hit - descending tone
    playerHit() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    // Shield activate - rising whoosh
    shieldActivate() {
        this.createTone(200, 'sine', 0.15);
        setTimeout(() => this.createTone(400, 'sine', 0.1), 50);
    }

    // Shield block - metallic ping
    shieldBlock() {
        this.createTone(1200, 'square', 0.05);
        this.createTone(800, 'square', 0.08);
    }

    // Enemy death - explosion
    enemyDeath() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        // Noise burst for explosion
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }

        const noise = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();

        noise.buffer = buffer;
        gain.gain.setValueAtTime(this.volume * 0.5, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);

        noise.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
    }

    // Boss phase change - alarm
    bossPhaseChange() {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.createTone(600, 'square', 0.1);
                this.createTone(800, 'square', 0.1);
            }, i * 150);
        }
    }

    // Boss death - epic explosion
    bossDeath() {
        this.enemyDeath();
        setTimeout(() => this.enemyDeath(), 100);
        setTimeout(() => this.enemyDeath(), 200);
        setTimeout(() => {
            this.createTone(100, 'sawtooth', 0.5);
        }, 300);
    }

    // Victory - triumphant arpeggio
    victory() {
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createTone(freq, 'square', 0.3);
            }, i * 150);
        });
    }

    // Defeat - sad descending
    defeat() {
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createTone(freq, 'sawtooth', 0.3);
            }, i * 200);
        });
    }

    // Wave start - alert
    waveStart() {
        this.createTone(440, 'square', 0.1);
        setTimeout(() => this.createTone(550, 'square', 0.15), 100);
    }

    // Button click - short blip
    buttonClick() {
        this.createTone(600, 'square', 0.05);
    }

    // Toggle sound
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// Global sound instance
const Sound = new SoundManager();

// Initialize on first click/keypress
document.addEventListener('click', () => Sound.resume(), { once: true });
document.addEventListener('keydown', () => Sound.resume(), { once: true });
