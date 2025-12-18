# Performance Optimization Plan - Step by Step

## 🔍 Current Issues Identified

1. **No Caching**: Every component makes fresh API calls on `ngOnInit`
2. **Multiple API Calls**: Same data fetched multiple times by different components
3. **Skeleton Loaders Always Show**: Data loads from scratch every navigation
4. **No Stale-While-Revalidate**: No mechanism to show cached data while fetching fresh data
5. **No Request Deduplication**: Multiple components requesting same data simultaneously

## 📋 Step-by-Step Optimization Plan

### **Step 1: Implement Service-Level Caching** ⭐ (Highest Impact)

**Goal**: Cache data in services so components can show cached data immediately while fetching fresh data in background.

**What to do**:
- Add caching to each service (SavingsService, DebtsService, TransactionsService, PatrimoineService)
- Use `BehaviorSubject` or `signal` to hold cached data
- Implement "stale-while-revalidate" pattern:
  - Return cached data immediately (if available)
  - Fetch fresh data in background
  - Update cache when fresh data arrives

**Benefits**:
- Instant display of cached data
- Background refresh keeps data fresh
- No skeleton loaders on subsequent visits

**Files to modify**:
- `src/app/pages/service/savings.service.ts`
- `src/app/pages/service/debts.service.ts`
- `src/app/pages/service/transactions.service.ts`
- `src/app/pages/service/patrimoine.service.ts`

---

### **Step 2: Add Cache Invalidation Strategy**

**Goal**: Clear cache when data is modified (create/update/delete operations).

**What to do**:
- When data is created/updated/deleted, invalidate cache
- Trigger background refresh after mutations
- Use `AssetsStateService` notifications to coordinate cache invalidation

**Benefits**:
- Data stays consistent
- Users see updates immediately after changes

---

### **Step 3: Implement Request Deduplication**

**Goal**: Prevent multiple simultaneous requests for the same data.

**What to do**:
- Track ongoing requests in services
- If a request is already in progress, return the same Promise/Observable
- Use RxJS `shareReplay` operator

**Benefits**:
- Reduces API calls
- Faster response times
- Less server load

---

### **Step 4: Add Cache TTL (Time-To-Live)**

**Goal**: Automatically refresh stale cache after a certain time.

**What to do**:
- Add timestamp to cached data
- Check if cache is stale (e.g., older than 5 minutes)
- Refresh automatically if stale

**Benefits**:
- Data stays reasonably fresh
- Reduces unnecessary API calls

---

### **Step 5: Optimize Component Loading Strategy**

**Goal**: Components should show cached data immediately, then refresh.

**What to do**:
- Components check cache first
- Show cached data immediately (no skeleton)
- Fetch fresh data in background
- Update UI when fresh data arrives

**Benefits**:
- Better UX (no waiting)
- Perceived performance improvement

---

### **Step 6: Add HTTP Response Caching**

**Goal**: Use Angular HTTP interceptors to cache GET requests.

**What to do**:
- Create HTTP interceptor for caching
- Cache GET requests for a short time (30-60 seconds)
- Invalidate cache on POST/PUT/DELETE

**Benefits**:
- Reduces network requests
- Works at HTTP level (automatic)

---

### **Step 7: Implement Route-Based Preloading**

**Goal**: Preload data for likely next routes.

**What to do**:
- Preload dashboard data when app starts
- Preload data when hovering over menu items
- Use Angular route preloading strategies

**Benefits**:
- Instant navigation
- Data ready before user clicks

---

### **Step 8: Optimize API Calls**

**Goal**: Reduce number of API calls and payload size.

**What to do**:
- Combine multiple requests where possible
- Use pagination for large lists
- Request only needed fields
- Implement server-side filtering/sorting

**Benefits**:
- Faster API responses
- Less bandwidth usage

---

## 🎯 Priority Order (Recommended Implementation)

1. **Step 1** - Service-Level Caching (Biggest impact, easiest to implement)
2. **Step 2** - Cache Invalidation (Necessary for Step 1 to work correctly)
3. **Step 3** - Request Deduplication (Prevents wasted API calls)
4. **Step 5** - Component Loading Strategy (Better UX)
5. **Step 4** - Cache TTL (Nice to have)
6. **Step 6** - HTTP Response Caching (Additional layer)
7. **Step 7** - Route Preloading (Advanced)
8. **Step 8** - API Optimization (Backend work)

## 📊 Expected Results

### Before Optimization:
- ⏱️ Every navigation: 500-2000ms skeleton loader
- 🔄 Multiple API calls per page
- 📡 Network requests on every navigation
- 😞 Poor user experience

### After Optimization (Steps 1-3):
- ⚡ Instant display (0ms) for cached data
- 🔄 Background refresh (invisible to user)
- 📡 Single API call per data type
- 😊 Smooth, fast navigation

## 🛠️ Implementation Details

### Service Caching Pattern (Example for SavingsService):

```typescript
@Injectable({ providedIn: 'root' })
export class SavingsService {
    // Cache with timestamp
    private _cache = signal<{
        data: SavingRecord[];
        timestamp: number;
    } | null>(null);
    
    private _loading = signal(false);
    private CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    
    async getTransactions(): Promise<SavingRecord[]> {
        const cached = this._cache();
        
        // Return cached data immediately if fresh
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            // Refresh in background
            this.refreshTransactions();
            return cached.data;
        }
        
        // No cache or stale - fetch fresh
        return this.refreshTransactions();
    }
    
    private async refreshTransactions(): Promise<SavingRecord[]> {
        this._loading.set(true);
        try {
            const data = await this.fetchFromAPI();
            this._cache.set({ data, timestamp: Date.now() });
            return data;
        } finally {
            this._loading.set(false);
        }
    }
}
```

### Component Pattern (Example):

```typescript
ngOnInit() {
    // Show cached data immediately (no loading state)
    const cached = this.service.getCachedData();
    if (cached) {
        this.data.set(cached);
    }
    
    // Refresh in background
    this.service.getData().then(fresh => {
        this.data.set(fresh);
    });
}
```

## ✅ Next Steps

Would you like me to:
1. **Implement Step 1-3** (Service caching + invalidation + deduplication)?
2. **Show you the code changes** before implementing?
3. **Start with one service** as an example?

Let me know which approach you prefer!

