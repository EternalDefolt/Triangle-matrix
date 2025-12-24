class HUD {
    constructor() {
        this.hpElement = document.getElementById('hp-val');
        this.hpBar = document.getElementById('hp-bar');
        this.shieldElement = document.getElementById('shield-val');
        this.shieldBar = document.getElementById('shield-bar');
        this.statusText = document.getElementById('status-text');
    }

    update(player) {
        // Update HP bar
        if (this.hpElement) {
            this.hpElement.innerText = `${player.hp}/${player.maxHP}`;
        }
        if (this.hpBar) {
            const hpPercent = (player.hp / player.maxHP) * 100;
            this.hpBar.style.width = `${hpPercent}%`;
        }

        // Update Shield bar
        if (this.shieldElement) {
            if (player.shieldCooldown > 0) {
                const seconds = (player.shieldCooldown / 60).toFixed(1);
                this.shieldElement.innerText = `ПЕРЕЗАРЯДКА ${seconds}с`;
                this.shieldElement.style.color = '#ff6666';
                if (this.shieldBar) {
                    const cooldownPercent = (1 - player.shieldCooldown / player.shieldCooldownMax) * 100;
                    this.shieldBar.style.width = `${cooldownPercent}%`;
                }
            } else {
                this.shieldElement.innerText = `${player.shieldHP}/${player.shieldMaxHP}`;
                this.shieldElement.style.color = '#fff';
                if (this.shieldBar) {
                    const shieldPercent = (player.shieldHP / player.shieldMaxHP) * 100;
                    this.shieldBar.style.width = `${shieldPercent}%`;
                }
            }
        }
    }

    setMessage(msg) {
        if (this.statusText) this.statusText.innerText = msg;
    }
}
