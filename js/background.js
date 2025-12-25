const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let shapes = [];
let particles = [];
const numShapes = 15;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        const speed = Math.random() * 3 + 1;
        const angle = Math.random() * Math.PI * 2;
        this.dx = Math.cos(angle) * speed;
        this.dy = Math.sin(angle) * speed;
        this.color = color;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.02;
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.life -= this.decay;
        this.draw();
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Shape {
    constructor() {
        this.radius = Math.random() * 20 + 20; // Radius for collision
        this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
        this.y = Math.random() * (canvas.height - this.radius * 2) + this.radius;
        this.dx = (Math.random() - 0.5) * 2; // Slower speed
        this.dy = (Math.random() - 0.5) * 2;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        this.sides = Math.floor(Math.random() * 5) + 3; // 3 to 7 sides (Triangle to Heptagon)
        if (Math.random() > 0.8) this.sides = 0; // chance for circle
        this.hp = 3;
        this.mass = this.radius;
        this.invulnerableTimeout = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.fillStyle = '#000000';

        ctx.beginPath();
        if (this.sides === 0) { // Circle
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        } else { // Polygon
            // Increase visual size slightly so the "radius" acts as incircle/circumcircle approx
            const step = (Math.PI * 2) / this.sides;
            // Align first point to top
            ctx.moveTo(0, -this.radius);
            for (let i = 1; i < this.sides; i++) {
                ctx.lineTo(Math.sin(i * step) * this.radius, -Math.cos(i * step) * this.radius);
            }
            ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();

        // Optional: Draw cracks or indication of damage? 
        // For now just white stroke is requested.

        ctx.restore();
    }

    update() {
        // Wall Bounce
        if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
            this.dx = -this.dx;
            // Push out of wall
            if (this.x + this.radius > canvas.width) this.x = canvas.width - this.radius;
            if (this.x - this.radius < 0) this.x = this.radius;
        }
        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
            this.dy = -this.dy;
            if (this.y + this.radius > canvas.height) this.y = canvas.height - this.radius;
            if (this.y - this.radius < 0) this.y = this.radius;
        }

        this.x += this.dx;
        this.y += this.dy;
        this.rotation += this.rotationSpeed;

        if (this.invulnerableTimeout > 0) this.invulnerableTimeout--;

        this.draw();
    }

    takeDamage() {
        if (this.invulnerableTimeout > 0) return false;

        this.hp--;
        this.invulnerableTimeout = 20; // Frames of invulnerability

        // Spark effect
        createParticles(this.x, this.y, 10, '#FFFFFF');

        return this.hp <= 0;
    }
}

function createParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function resolveCollision(s1, s2) {
    const dx = s2.x - s1.x;
    const dy = s2.y - s1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < s1.radius + s2.radius) {
        // Calculate collision response (Elastic)
        const vCollision = { x: s2.x - s1.x, y: s2.y - s1.y };
        const vDistance = Math.sqrt((vCollision.x * vCollision.x) + (vCollision.y * vCollision.y));
        const vCollisionNorm = { x: vCollision.x / vDistance, y: vCollision.y / vDistance };

        const vRelativeVelocity = { x: s1.dx - s2.dx, y: s1.dy - s2.dy };
        const speed = vRelativeVelocity.x * vCollisionNorm.x + vRelativeVelocity.y * vCollisionNorm.y;

        if (speed < 0) return; // Moving away

        // Damage calculation
        const broken1 = s1.takeDamage();
        const broken2 = s2.takeDamage();

        if (broken1) {
            createParticles(s1.x, s1.y, 30, '#FFFFFF'); // Explosion
            shapes = shapes.filter(s => s !== s1);
        }
        if (broken2) {
            createParticles(s2.x, s2.y, 30, '#FFFFFF'); // Explosion
            shapes = shapes.filter(s => s !== s2);
        }

        // Impulse
        const impulse = 2 * speed / (s1.mass + s2.mass);
        s1.dx -= (impulse * s2.mass * vCollisionNorm.x);
        s1.dy -= (impulse * s2.mass * vCollisionNorm.y);
        s2.dx += (impulse * s1.mass * vCollisionNorm.x);
        s2.dy += (impulse * s1.mass * vCollisionNorm.y);

        // Anti-sticking: separate bodies
        const overlap = (s1.radius + s2.radius - distance) + 1; // +1 buffer
        // Move apart inversely proportional to mass (here mass is radius)
        const totalMass = s1.mass + s2.mass;
        const m1Ratio = s2.mass / totalMass;
        const m2Ratio = s1.mass / totalMass;

        s1.x -= vCollisionNorm.x * overlap * m1Ratio;
        s1.y -= vCollisionNorm.y * overlap * m1Ratio;
        s2.x += vCollisionNorm.x * overlap * m2Ratio;
        s2.y += vCollisionNorm.y * overlap * m2Ratio;
    }
}

function init() {
    shapes = [];
    particles = [];
    for (let i = 0; i < numShapes; i++) {
        // Safe spawn (try not to overlap initially, but simple is okay for now)
        shapes.push(new Shape());
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filter dead particles
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => p.update());

    // Update shapes
    for (let i = 0; i < shapes.length; i++) {
        shapes[i].update();
    }

    // Check collisions
    // Simple O(N^2) checks are fine for N=15
    for (let i = 0; i < shapes.length; i++) {
        for (let j = i + 1; j < shapes.length; j++) {
            resolveCollision(shapes[i], shapes[j]);
        }
    }

    // Auto-spawn shapes if too few? (Optional, user didn't ask but good for longevity)
    if (shapes.length < 5) {
        if (Math.random() < 0.05) shapes.push(new Shape());
    }

    requestAnimationFrame(animate);
}

init();
animate();
