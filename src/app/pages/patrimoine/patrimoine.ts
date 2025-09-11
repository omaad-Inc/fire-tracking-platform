import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DataViewModule } from 'primeng/dataview';
import { OrderListModule } from 'primeng/orderlist';
import { PickListModule } from 'primeng/picklist';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { PatrimoineProgress } from './components/patrimoineprogress';
import { PatrimoineStats } from './components/patrimoinestats';

@Component({
    selector: 'app-patrimoine',
    standalone: true,
    imports: [PatrimoineProgress, PatrimoineStats],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <div class="col-span-12 xl:col-span-8">
                <app-patrimoine-progress />
            </div>
            <app-patrimoine-stats class="col-span-12 xl:col-span-4" />
            
        </div>
    `
})
export class Patrimoine {}
