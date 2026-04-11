import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Shared state service for assets - allows components to react to asset changes
 */
@Injectable({ providedIn: 'root' })
export class AssetsStateService {
    // Signal to notify when assets have been updated
    private _assetsUpdated = new Subject<void>();
    public assetsUpdated$ = this._assetsUpdated.asObservable();
    
    // Signal to notify when debts have been updated
    private _debtsUpdated = new Subject<void>();
    public debtsUpdated$ = this._debtsUpdated.asObservable();
    
    // Signal to notify when savings have been updated
    private _savingsUpdated = new Subject<void>();
    public savingsUpdated$ = this._savingsUpdated.asObservable();
    
    // Signal to notify when transactions have been updated
    private _transactionsUpdated = new Subject<void>();
    public transactionsUpdated$ = this._transactionsUpdated.asObservable();

    /**
     * Notify all subscribers that assets have been updated
     */
    notifyAssetsUpdated(): void {
        this._assetsUpdated.next();
    }
    
    /**
     * Notify all subscribers that debts have been updated
     */
    notifyDebtsUpdated(): void {
        this._debtsUpdated.next();
    }
    
    /**
     * Notify all subscribers that savings have been updated
     */
    notifySavingsUpdated(): void {
        this._savingsUpdated.next();
    }
    
    /**
     * Notify all subscribers that transactions have been updated
     */
    notifyTransactionsUpdated(): void {
        this._transactionsUpdated.next();
    }
}

