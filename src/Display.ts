import * as echarts from "echarts/core";
import { HeatmapChart, LineChart } from "echarts/charts";
import {
  AxisPointerComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { EnvironmentDisplayState } from "./Environment";

echarts.use([
  LineChart,
  HeatmapChart,
  GridComponent,
  AxisPointerComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export interface DisplayContext {
  environmentState: EnvironmentDisplayState;
  time: number;
};

// per-series values indexed by tick, aligned with times
interface ChartData {
  times: string[];
  agentIds: string[];
  buyRates: number[];
  sellRates: number[];
  capitals: Map<string, number[]>;
  decisions: Map<string, number[]>;
}

const SERIES_COLORS = [
  '#2a9d8f', '#e76f51', '#264653', '#e9c46a', '#8338ec',
  '#ff006e', '#3a86ff', '#fb5607', '#6a994e', '#bc6c25',
];

const BUY_COLOR = '#2a9d8f';
const SELL_COLOR = '#e76f51';

// the three charts are grids of a single chart instance, so one tooltip covers all of them
const RATE_GRID = 0;
const CAPITAL_GRID = 1;
const DECISION_GRID = 2;

// fixed plot bounds for every grid; 'none' stops ECharts from shrinking each grid to fit
// its own axis labels, which would misalign them. left must fit the longest agent name
const GRID_BOUNDS = { left: 160, right: 30, outerBoundsMode: 'none' as const };

export class Display {
  private _lastUpdateTime = 0;

  private _chart: echarts.ECharts;

  constructor(
    private textContentElement: HTMLElement,
    chartElement: HTMLElement
  ) {
    this._chart = echarts.init(chartElement);
  }

  public update(history: DisplayContext[]) {
    const current = history.at(-1);
    if (!current) return;

    this._updateText(current);
    this._drawCharts(this._toChartData(history));
  }

  private _updateText({
    time,
    environmentState: {
      buyRate,
      sellRate,
      agents
    }
  }: DisplayContext): void {
    const now = Date.now();
    const fps = this._lastUpdateTime ? 1_000 / (now - this._lastUpdateTime) : 0;
    this._lastUpdateTime = now;

    this.textContentElement.innerHTML = `
      <div>Time lapsed: ${time} [FPS: ${fps.toFixed(0)}]</div>
      <div>Buy rate: ${buyRate}</div>
      <div>Sell rate: ${sellRate}</div>
      <br/>
      <table>
        <tr>
          <td width=200><b>Name</b></td><td width=100><b>USD</b></td><td width=100><b>Gold</b></td><td width=100><b>Capital</b></td>
        </tr>
        ${agents.map(agent => `
            <tr>
              <td>${agent.id}</td><td>${agent.usdAmount.toFixed(2)}</td><td>${agent.goldAmount.toFixed(2)}</td><td>${agent.capital.toFixed(2)}</td>
            </tr>
          `).join('\n')
      }
      </table>
    `;
  }

  private _toChartData(history: DisplayContext[]): ChartData {
    const agentIds = [...new Set(history.flatMap(({ environmentState }) =>
      environmentState.agents.map(agent => agent.id)
    ))];

    const capitals = new Map<string, number[]>();
    const decisions = new Map<string, number[]>();
    for (const agentId of agentIds) {
      // an agent missing at some tick gets no capital point and no decision there
      capitals.set(agentId, history.map(({ environmentState }) =>
        environmentState.agents.find(agent => agent.id === agentId)?.capital ?? NaN
      ));
      decisions.set(agentId, history.map(({ environmentState }) =>
        environmentState.agents.find(agent => agent.id === agentId)?.action?.buy ?? 0
      ));
    }

    return {
      times: history.map(({ time }) => time.toString()),
      agentIds,
      buyRates: history.map(({ environmentState }) => environmentState.buyRate),
      sellRates: history.map(({ environmentState }) => environmentState.sellRate),
      capitals,
      decisions,
    };
  }

  private _drawCharts(data: ChartData): void {
    const { agentIds } = data;

    const heatmapData: [number, number, number][] = [];
    let maxAmount = 0;
    agentIds.forEach((agentId, agentIndex) => {
      data.decisions.get(agentId)!.forEach((value, timeIndex) => {
        if (!value) return;
        heatmapData.push([timeIndex, agentIndex, value]);
        maxAmount = Math.max(maxAmount, Math.abs(value));
      });
    });

    const xAxis = (gridIndex: number) => ({
      type: 'category' as const,
      gridIndex,
      data: data.times,
      boundaryGap: gridIndex === DECISION_GRID,
      axisLabel: { show: gridIndex === DECISION_GRID },
    });

    this._chart.setOption({
      animation: false,
      color: SERIES_COLORS,
      legend: {
        type: 'scroll',
        top: 0,
        left: GRID_BOUNDS.left,
        right: GRID_BOUNDS.right,
        data: ['Buy rate', 'Sell rate', ...agentIds],
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        formatter: (params: unknown) => this._formatTooltip(params, data),
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { ...GRID_BOUNDS, top: 60, height: 180 },
        { ...GRID_BOUNDS, top: 280, height: 220 },
        { ...GRID_BOUNDS, top: 540, height: 24 * agentIds.length },
      ],
      xAxis: [xAxis(RATE_GRID), xAxis(CAPITAL_GRID), xAxis(DECISION_GRID)],
      yAxis: [
        { type: 'value', gridIndex: RATE_GRID, name: 'Rate', scale: true },
        { type: 'value', gridIndex: CAPITAL_GRID, name: 'Capital', scale: true },
        { type: 'category', gridIndex: DECISION_GRID, data: agentIds, inverse: true },
      ],
      visualMap: {
        show: false,
        seriesIndex: 2 + agentIds.length,
        min: -maxAmount || -1,
        max: maxAmount || 1,
        inRange: { color: [SELL_COLOR, '#ffffff', BUY_COLOR] },
      },
      series: [
        {
          name: 'Buy rate', type: 'line', showSymbol: false,
          xAxisIndex: RATE_GRID, yAxisIndex: RATE_GRID,
          data: data.buyRates, itemStyle: { color: BUY_COLOR },
        },
        {
          name: 'Sell rate', type: 'line', showSymbol: false,
          xAxisIndex: RATE_GRID, yAxisIndex: RATE_GRID,
          data: data.sellRates, itemStyle: { color: SELL_COLOR },
        },
        ...agentIds.map((agentId, index) => ({
          name: agentId, type: 'line' as const, showSymbol: false,
          xAxisIndex: CAPITAL_GRID, yAxisIndex: CAPITAL_GRID,
          data: data.capitals.get(agentId),
          itemStyle: { color: SERIES_COLORS[index % SERIES_COLORS.length] },
        })),
        {
          name: 'Decisions', type: 'heatmap',
          xAxisIndex: DECISION_GRID, yAxisIndex: DECISION_GRID,
          data: heatmapData,
        },
      ],
    });
  }

  // built from the chart data rather than params, so it looks the same whichever grid is hovered
  private _formatTooltip(params: unknown, data: ChartData): string {
    const [first] = params as { axisValue: string }[];
    if (!first) return '';

    const index = data.times.indexOf(first.axisValue);
    if (index < 0) return '';

    const decision = (value: number) => {
      if (!value) return '—';
      const color = value > 0 ? BUY_COLOR : SELL_COLOR;
      return `<span style="color:${color}">${value > 0 ? 'buy' : 'sell'} ${Math.abs(value).toFixed(2)}</span>`;
    };

    return `
      <b>Time ${first.axisValue}</b><br/>
      Buy rate: ${data.buyRates[index].toFixed(4)}<br/>
      Sell rate: ${data.sellRates[index].toFixed(4)}
      <table style="margin-top:4px">
        <tr><td><b>Agent</b></td><td style="padding-left:12px"><b>Capital</b></td><td style="padding-left:12px"><b>Decision</b></td></tr>
        ${data.agentIds.map(agentId => `
          <tr>
            <td>${agentId}</td>
            <td style="padding-left:12px">${data.capitals.get(agentId)![index].toFixed(2)}</td>
            <td style="padding-left:12px">${decision(data.decisions.get(agentId)![index])}</td>
          </tr>
        `).join('')}
      </table>
    `;
  }
}
