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

interface DisplayContext {
  environmentState: EnvironmentDisplayState;
  time: number;
};

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

export class Display {
  private _lastUpdateTime = 0;

  private _chart: echarts.ECharts;

  // all histories are indexed by tick, aligned with _times
  private _times: string[] = [];
  private _buyRateHistory: number[] = [];
  private _sellRateHistory: number[] = [];
  private _capitalHistory = new Map<string, number[]>();
  private _decisionHistory = new Map<string, number[]>();

  constructor(
    private textContentElement: HTMLElement,
    chartElement: HTMLElement
  ) {
    this._chart = echarts.init(chartElement);
  }

  public update(displayContext: DisplayContext) {
    this._updateText(displayContext);
    this._updateHistory(displayContext);
    this._drawCharts();
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

  private _updateHistory({
    time,
    environmentState: {
      buyRate,
      sellRate,
      agents,
    }
  }: DisplayContext): void {
    this._times.push(time.toString());
    this._buyRateHistory.push(buyRate);
    this._sellRateHistory.push(sellRate);

    for (const agent of agents) {
      this._getHistory(this._capitalHistory, agent.id).push(agent.capital);
      this._getHistory(this._decisionHistory, agent.id).push(agent.action?.buy ?? 0);
    }
  }

  // an agent added mid-run gets its history padded so indices stay aligned with _times
  private _getHistory(histories: Map<string, number[]>, agentId: string): number[] {
    let history = histories.get(agentId);
    if (!history) {
      history = new Array(this._times.length - 1).fill(NaN);
      histories.set(agentId, history);
    }
    return history;
  }

  private _drawCharts(): void {
    const agentIds = [...this._capitalHistory.keys()];

    const heatmapData: [number, number, number][] = [];
    let maxAmount = 0;
    agentIds.forEach((agentId, agentIndex) => {
      this._decisionHistory.get(agentId)!.forEach((value, timeIndex) => {
        if (!value) return;
        heatmapData.push([timeIndex, agentIndex, value]);
        maxAmount = Math.max(maxAmount, Math.abs(value));
      });
    });

    const xAxis = (gridIndex: number) => ({
      type: 'category' as const,
      gridIndex,
      data: this._times,
      boundaryGap: gridIndex === DECISION_GRID,
      axisLabel: { show: gridIndex === DECISION_GRID },
    });

    this._chart.setOption({
      animation: false,
      color: SERIES_COLORS,
      legend: {
        top: 0,
        data: ['Buy rate', 'Sell rate', ...agentIds],
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        formatter: (params: unknown) => this._formatTooltip(params, agentIds),
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { top: 50, height: 180, left: 70, right: 30 },
        { top: 270, height: 220, left: 70, right: 30 },
        { top: 530, height: 24 * agentIds.length, left: 70, right: 30 },
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
          data: this._buyRateHistory, itemStyle: { color: BUY_COLOR },
        },
        {
          name: 'Sell rate', type: 'line', showSymbol: false,
          xAxisIndex: RATE_GRID, yAxisIndex: RATE_GRID,
          data: this._sellRateHistory, itemStyle: { color: SELL_COLOR },
        },
        ...agentIds.map((agentId, index) => ({
          name: agentId, type: 'line' as const, showSymbol: false,
          xAxisIndex: CAPITAL_GRID, yAxisIndex: CAPITAL_GRID,
          data: this._capitalHistory.get(agentId),
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

  // built from the stored histories rather than params, so it looks the same whichever grid is hovered
  private _formatTooltip(params: unknown, agentIds: string[]): string {
    const [first] = params as { axisValue: string }[];
    if (!first) return '';

    const index = this._times.indexOf(first.axisValue);
    if (index < 0) return '';

    const decision = (value: number) => {
      if (!value) return '—';
      const color = value > 0 ? BUY_COLOR : SELL_COLOR;
      return `<span style="color:${color}">${value > 0 ? 'buy' : 'sell'} ${Math.abs(value).toFixed(2)}</span>`;
    };

    return `
      <b>Time ${first.axisValue}</b><br/>
      Buy rate: ${this._buyRateHistory[index].toFixed(4)}<br/>
      Sell rate: ${this._sellRateHistory[index].toFixed(4)}
      <table style="margin-top:4px">
        <tr><td><b>Agent</b></td><td style="padding-left:12px"><b>Capital</b></td><td style="padding-left:12px"><b>Decision</b></td></tr>
        ${agentIds.map(agentId => `
          <tr>
            <td>${agentId}</td>
            <td style="padding-left:12px">${this._capitalHistory.get(agentId)![index].toFixed(2)}</td>
            <td style="padding-left:12px">${decision(this._decisionHistory.get(agentId)![index])}</td>
          </tr>
        `).join('')}
      </table>
    `;
  }
}
