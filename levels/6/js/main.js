const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

let player, hud, boss, minions = [], bullets = [], enemyBullets = [], particles = [], isGameOver = false, bossDefeated = false;
const bossLeft = document.getElementById('boss-hp-left');
const bossRight = document.getElementById('boss-hp-right');

function spawnParticles(x,y,count,color){ for(let i=0;i<count;i++){ particles.push({ x,y, vx:(Math.random()-0.5)*5, vy:(Math.random()-0.5)*5, life:1.0, color: color||'#FFF' }); } }

function init(){
    hud = new HUD();
    player = new Player(canvas.width/2, canvas.height-150, (x,y,angle)=>{
        bullets.push({ x,y, vx: Math.cos(angle)*10, vy: Math.sin(angle)*10, life:100 });
        Sound.playerShoot();
    });

    // accept optional color parameter from boss onShoot
    boss = new BossLevel6(canvas.width/2, 150, (x,y,vx,vy,color)=>{ enemyBullets.push({ x,y,vx,vy, life:300, color: color }); });

    loop();
}

function spawnMinion(x,y){ minions.push(new CircleEnemy(x,y)); }

function updateBossHP(){
    if (!boss) return;
    const half = boss.getMaxHP() / 2;
    const leftHP = Math.max(0, Math.min(half, boss.getHP() - half));
    // but boss.getHP() returns full hp; compute halves
    const hp = boss.getHP();
    const left = Math.max(0, Math.min(half, hp));
    const right = Math.max(0, Math.min(half, Math.max(0, hp - half)));
    // left bar represents first half (top), right bar second half
    const leftPercent = (left / half) * 100;
    const rightPercent = (right / half) * 100;
    bossLeft.style.width = `${leftPercent}%`;
    bossRight.style.width = `${rightPercent}%`;
}

function loop(){
    if (isGameOver) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);

    player.update(canvas.width, canvas.height);
    hud.update(player);

    if (player.hp <= 0) {
        isGameOver = true; Sound.defeat(); document.getElementById('death-overlay').style.display = 'flex'; return;
    }

    if (boss && boss.hp > 0) {
        boss.update(player, spawnMinion);
        boss.draw(ctx);
        updateBossHP();
    } else if (boss && boss.hp <= 0 && !bossDefeated) {
        bossDefeated = true;
        spawnParticles(boss.x, boss.y, 80, '#FFF');
        Sound.bossDeath();
        const bx = boss.x, by = boss.y; boss = null;
        minions.forEach(m => spawnParticles(m.x, m.y, 10, '#FFF'));
        minions = [];
        enemyBullets = [];
        bossLeft.style.width = '0%'; bossRight.style.width = '0%';
        setTimeout(()=>{ Sound.victory(); document.getElementById('victory-overlay').style.display = 'flex'; isGameOver = true; }, 600);
    }

    for (let i = minions.length-1;i>=0;i--){ let m = minions[i]; m.update(player); m.draw(ctx); }

    for (let i = bullets.length-1;i>=0;i--){ let b = bullets[i]; b.x += b.vx; b.y += b.vy; b.life--; ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fill();
        if (boss && boss.hp > 0){ const dx = boss.x - b.x, dy = boss.y - b.y, dist = Math.sqrt(dx*dx+dy*dy); if (dist < boss.radius + 4){ boss.takeDamage(); spawnParticles(b.x,b.y,3,boss.getColor()); bullets.splice(i,1); continue; }}
        for (let j = minions.length-1;j>=0;j--){ let m = minions[j]; const dx = m.x - b.x, dy = m.y - b.y, dist = Math.sqrt(dx*dx+dy*dy); if (dist < m.radius + 4){ m.takeDamage(); spawnParticles(m.x,m.y,5,'#FFF'); bullets.splice(i,1); if (m.hp <= 0){ minions.splice(j,1); spawnParticles(m.x,m.y,15,'#FFF'); Sound.enemyDeath(); } break; } }
        if (b.life <= 0) bullets.splice(i,1);
    }

    for (let i = enemyBullets.length-1;i>=0;i--){ let b = enemyBullets[i]; b.x += b.vx; b.y += b.vy; b.life--; ctx.fillStyle = b.color || (boss ? boss.getColor() : '#FF4444'); ctx.beginPath(); ctx.arc(b.x,b.y,5,0,Math.PI*2); ctx.fill();
        const dx = player.x - b.x, dy = player.y - b.y, dist = Math.sqrt(dx*dx+dy*dy); let hit = false;
        if (player.isShielding && player.shieldCooldown <= 0){ if (dist < player.size * 1.5 + 5){ player.hitShield(); spawnParticles(b.x,b.y,5,'#AAA'); Sound.shieldBlock(); hit = true; }}
        if (!hit && dist < player.size + 5){ player.takeDamage(5); spawnParticles(player.x, player.y, 10, '#F00'); Sound.playerHit(); hit = true; }
        if (hit || b.life <= 0) enemyBullets.splice(i,1);
    }

    for (let i = particles.length-1;i>=0;i--){ let p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.05; ctx.globalAlpha = Math.max(0,p.life); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x,p.y,2,0,Math.PI*2); ctx.fill(); ctx.globalAlpha = 1; if (p.life <= 0) particles.splice(i,1); }

    player.draw(ctx);
    requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') location.href = '../../ui_menu/html/index.html'; });

init();
