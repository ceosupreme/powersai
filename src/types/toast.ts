export interface ToastSalesData {
  weeklySales: number;
  lastYearSales: number;
  yearOverYearChange: number;
}

export interface ToastTipsData {
  weeklyTipPercent: number;
  tipAmount: number;
}

export interface ToastCompsData {
  amount: number;
  percent: number;
}

export interface ToastTicketData {
  avgTicket: number;
  turnTimeMinutes: number;
  totalTickets: number;
  ticketTimeBreakdown: {
    under10: number;
    under15: number;
    over15: number;
  };
  avgKdsTimeMins?: number;
  kdsTicketCount?: number;
  kdsTimeBreakdown?: {
    under5: number;
    under10: number;
    over10: number;
  };
}

export interface ToastLaborBreakdown {
  hours: number;
  cost: number;
}

export interface ToastLaborData {
  totalHours: number;
  totalCost: number;
  laborPercent: number;
  bohLabor: ToastLaborBreakdown;
  fohLabor: ToastLaborBreakdown;
  salesPerLaborHour: number;
  avgHourlyRate: number;
  grillPrepHourly: number | null;
  fryHourly: number | null;
}

export interface ToastBeverage {
  name: string;
  sales: number;
  quantity: number;
}

export interface ToastMenuData {
  foodSales: number;
  bevSales: number;
  foodBevRatio: string;
  topBeverages: ToastBeverage[];
}

export interface ToastWidgetData {
  sales: ToastSalesData;
  tips: ToastTipsData;
  comps: ToastCompsData;
  discounts?: ToastCompsData;
  refunds?: ToastCompsData;
  tickets: ToastTicketData;
  labor: ToastLaborData;
  menu: ToastMenuData;
  dateRange: {
    start: string;
    end: string;
  };
  lastUpdated: string;
  isLive: boolean;
}
