import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PinService } from '../services/pin.service';

@Component({
    selector: 'app-pin-lock',
    standalone: true,
    imports: [CommonModule],
    template: `
        <!-- Full-screen lock overlay -->
        <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center
                    bg-warm-900 select-none"
             style="touch-action: none;">

            <!-- Background glow -->
            <div class="absolute top-0 left-1/3 w-96 h-96 bg-brand-700/10 dark:bg-brand-300/15 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-700/5 dark:bg-brand-300/10 rounded-full blur-3xl pointer-events-none"></div>

            <div class="relative flex flex-col items-center w-full max-w-xs px-6">
                <!-- Lock icon -->
                <div class="w-16 h-16 rounded-full border-2 border-ochre-500/50 flex items-center justify-center mb-5">
                    <i class="pi pi-lock text-ochre-500 text-xl"></i>
                </div>

                <!-- Title -->
                <h2 class="text-white text-lg font-semibold mb-1">Entrez votre code PIN</h2>
                <p class="text-warm-500 text-sm mb-8">
                    @if (pinService.failedAttempts() > 0) {
                        <span class="text-negative">
                            Code incorrect · {{ 5 - pinService.failedAttempts() }} tentative{{ 5 - pinService.failedAttempts() !== 1 ? 's' : '' }} restante{{ 5 - pinService.failedAttempts() !== 1 ? 's' : '' }}
                        </span>
                    } @else {
                        Omaad Wealth
                    }
                </p>

                <!-- PIN dots -->
                <div class="flex gap-5 mb-10" [class.animate-shake]="shaking()">
                    @for (i of [0,1,2,3]; track i) {
                        <div class="w-4 h-4 rounded-full border-2 transition-all duration-150"
                             [ngClass]="i < enteredDigits().length
                                 ? 'bg-ochre-500 border-ochre-500 scale-110'
                                 : 'border-ochre-500/40 bg-transparent'">
                        </div>
                    }
                </div>

                <!-- Numpad -->
                <div class="grid grid-cols-3 gap-4 w-full">
                    @for (key of numpadKeys; track key.value) {
                        @if (key.value === 'bio') {
                            <!-- Biometric button placeholder (hidden on web, visible with Capacitor) -->
                            <button class="numpad-btn opacity-20 cursor-default" disabled>
                                <i class="pi pi-wave-pulse text-2xl text-white"></i>
                            </button>
                        } @else if (key.value === 'del') {
                            <button class="numpad-btn" (click)="onDelete()"
                                    [disabled]="enteredDigits().length === 0">
                                <i class="pi pi-delete-left text-xl text-white"></i>
                            </button>
                        } @else {
                            <button class="numpad-btn" (click)="onDigit(key.value)">
                                <span class="text-2xl font-light text-white">{{ key.value }}</span>
                            </button>
                        }
                    }
                </div>

                <!-- Forgot PIN -->
                <button (click)="onForgotPin()"
                        class="mt-8 text-ochre-500/80 hover:text-ochre-400 text-sm font-medium transition-colors">
                    Code PIN oublié ?
                </button>
            </div>
        </div>
    `,
    styles: [`
        .numpad-btn {
            width: 72px;
            height: 72px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.15s ease;
            margin: 0 auto;
            -webkit-tap-highlight-color: transparent;
        }

        .numpad-btn:active:not(:disabled) {
            background: rgba(255, 255, 255, 0.12);
            transform: scale(0.92);
        }

        .numpad-btn:disabled {
            opacity: 0.3;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%      { transform: translateX(-12px); }
            40%      { transform: translateX(10px); }
            60%      { transform: translateX(-8px); }
            80%      { transform: translateX(6px); }
        }

        .animate-shake {
            animation: shake 0.4s ease-in-out;
        }
    `]
})
export class PinLockComponent {
    pinService = inject(PinService);

    enteredDigits = signal<string[]>([]);
    shaking       = signal(false);

    numpadKeys = [
        { value: '1' }, { value: '2' }, { value: '3' },
        { value: '4' }, { value: '5' }, { value: '6' },
        { value: '7' }, { value: '8' }, { value: '9' },
        { value: 'bio' }, { value: '0' }, { value: 'del' },
    ];

    async onDigit(digit: string) {
        const current = this.enteredDigits();
        if (current.length >= 4) return;

        const next = [...current, digit];
        this.enteredDigits.set(next);

        // When 4 digits entered, verify
        if (next.length === 4) {
            const pin = next.join('');
            // Small delay so the 4th dot fills visually before verification
            await new Promise(r => setTimeout(r, 150));

            const correct = await this.pinService.verify(pin);
            if (!correct) {
                // Shake and clear
                this.shaking.set(true);
                setTimeout(() => {
                    this.shaking.set(false);
                    this.enteredDigits.set([]);
                }, 450);
            }
            // If correct, PinService sets locked=false and the overlay disappears
        }
    }

    onDelete() {
        const current = this.enteredDigits();
        if (current.length > 0) {
            this.enteredDigits.set(current.slice(0, -1));
        }
    }

    onForgotPin() {
        // Forgot PIN = force logout (re-authenticate to reset)
        if (confirm('Vous serez déconnecté. Vous pourrez reconfigurer votre PIN après reconnexion.')) {
            this.pinService.removePin();
            this.pinService.onForcedLogout?.();
        }
    }
}
