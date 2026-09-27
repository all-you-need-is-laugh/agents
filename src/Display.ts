import { HeatmapChart, LineChart } from "echarts/charts";
import {
  AxisPointerComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { EnvironmentDisplayState } from "./Environment";

echarts.use([
  LineChart,
  HeatmapChart,
  GridComponent,
  AxisPointerComponent,
  GraphicComponent,
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
  usdAmounts: Map<string, number[]>;
  goldAmounts: Map<string, number[]>;
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

const LEGEND_HEIGHT = 22;

const agentColor = (agentIndex: number) => SERIES_COLORS[agentIndex % SERIES_COLORS.length];

const colorDot = (color: string) =>
  `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;background:${color}"></span>`;

export class Display {
  private _lastUpdateTime = 0;

  private _chart: echarts.ECharts;

  private _data: ChartData | null = null;
  private _plotTop = 0;
  private _plotBottom = 0;

  // time the tooltip is pinned to by a click; null while it follows the mouse
  private _capturedTime: string | null = null;

  constructor(
    private textContentElement: HTMLElement,
    private chartElement: HTMLElement
  ) {
    this._chart = echarts.init(chartElement);

    this._chart.getZr().on('click', ({ offsetX, offsetY }) => this._capture(offsetX, offsetY));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') this._release();
      else if (event.key === 'ArrowLeft') this._moveCapture(-1, event);
      else if (event.key === 'ArrowRight') this._moveCapture(1, event);
    });
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

    type AgentDisplayState = EnvironmentDisplayState['agents'][number];

    // an agent missing at some tick gets `missing` there (no point / no decision)
    const perAgent = (pick: (agent: AgentDisplayState) => number, missing: number) =>
      new Map(agentIds.map(agentId => [agentId, history.map(({ environmentState }) => {
        const agent = environmentState.agents.find(agent => agent.id === agentId);
        return agent ? pick(agent) : missing;
      })]));

    const usdAmounts = perAgent(agent => agent.usdAmount, NaN);
    const goldAmounts = perAgent(agent => agent.goldAmount, NaN);
    const capitals = perAgent(agent => agent.capital, NaN);
    const decisions = perAgent(agent => agent.action?.buyGoldAmount ?? 0, 0);

    return {
      times: history.map(({ time }) => time.toString()),
      agentIds,
      buyRates: history.map(({ environmentState }) => environmentState.buyRate),
      sellRates: history.map(({ environmentState }) => environmentState.sellRate),
      usdAmounts,
      goldAmounts,
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

    const rateGridTop = LEGEND_HEIGHT + 30;
    const capitalGridTop = rateGridTop + 220;
    const decisionGridTop = capitalGridTop + 260;
    const decisionGridHeight = 24 * agentIds.length;
    this._fitChartHeight(decisionGridTop + decisionGridHeight + 30);

    this._data = data;
    this._plotTop = rateGridTop;
    this._plotBottom = decisionGridTop + decisionGridHeight;

    const xAxis = (gridIndex: number) => ({
      type: 'category' as const,
      gridIndex,
      data: data.times,
      // same on every grid, so a tick has the same x across all charts
      boundaryGap: true,
      axisLabel: { show: gridIndex === DECISION_GRID },
    });

    this._chart.setOption({
      animation: false,
      color: SERIES_COLORS,
      // agents are identified by the color dots in the tooltip instead
      legend: {
        top: 0,
        left: GRID_BOUNDS.left,
        right: GRID_BOUNDS.right,
        data: ['Buy rate', 'Sell rate'],
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        // pinned just past the chart's right edge so it never covers the plots
        position: (_point: number[], _params: unknown, _dom: unknown, _rect: unknown, size: { viewSize: number[] }) =>
          [size.viewSize[0] + 10, 0],
        transitionDuration: 0,
        formatter: (params: unknown) => this._formatTooltip(params, data),
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { ...GRID_BOUNDS, top: rateGridTop, height: 180 },
        { ...GRID_BOUNDS, top: capitalGridTop, height: 220 },
        { ...GRID_BOUNDS, top: decisionGridTop, height: decisionGridHeight },
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
          itemStyle: { color: agentColor(index) },
        })),
        {
          name: 'Decisions', type: 'heatmap',
          xAxisIndex: DECISION_GRID, yAxisIndex: DECISION_GRID,
          data: heatmapData,
        },
      ],
    });

    this._renderCapture();
  }

  private _capture(x: number, y: number): void {
    if (!this._data) return;

    const gridIndex = [RATE_GRID, CAPITAL_GRID, DECISION_GRID]
      .find(gridIndex => this._chart.containPixel({ gridIndex }, [x, y]));
    if (gridIndex === undefined) return;

    const value = this._chart.convertFromPixel({ xAxisIndex: gridIndex }, x) as number;
    const index = Math.min(Math.max(Math.round(value), 0), this._data.times.length - 1);

    this._capturedTime = this._data.times[index];
    this._renderCapture();
  }

  // steps the captured time by `step` ticks, stopping at the first and last tick
  private _moveCapture(step: number, event: KeyboardEvent): void {
    if (this._capturedTime === null || !this._data) return;

    const index = this._data.times.indexOf(this._capturedTime);
    if (index < 0) return;

    // keep the page from scrolling sideways while stepping
    event.preventDefault();

    const nextIndex = Math.min(Math.max(index + step, 0), this._data.times.length - 1);
    if (nextIndex === index) return;

    this._capturedTime = this._data.times[nextIndex];
    this._renderCapture();
  }

  private _release(): void {
    if (this._capturedTime === null) return;

    this._capturedTime = null;
    this._renderCapture();
  }

  // shows a marker at the captured time and keeps the tooltip on it; hides both when released
  private _renderCapture(): void {
    const index = this._capturedTime === null ? -1 : this._data?.times.indexOf(this._capturedTime) ?? -1;
    const isCaptured = index >= 0;
    const x = isCaptured
      ? this._chart.convertToPixel({ xAxisIndex: RATE_GRID }, this._capturedTime!) as number
      : 0;

    this._chart.setOption({
      tooltip: { alwaysShowContent: isCaptured },
      graphic: [{
        id: 'captured-time',
        type: 'line',
        silent: true,
        invisible: !isCaptured,
        z: 100,
        shape: { x1: x, y1: this._plotTop, x2: x, y2: this._plotBottom },
        style: { stroke: '#e63946', lineWidth: 1.5, lineDash: [4, 3] },
      }],
    });

    this._chart.dispatchAction(isCaptured
      ? { type: 'showTip', seriesIndex: 0, dataIndex: index }
      : { type: 'hideTip' });
  }

  private _fitChartHeight(height: number): void {
    if (this.chartElement.clientHeight === height) return;
    this.chartElement.style.height = `${height}px`;
    this._chart.resize();
  }

  // built from the chart data rather than params, so it looks the same whichever grid is hovered
  private _formatTooltip(params: unknown, data: ChartData): string {
    // a captured time wins over whatever the mouse is hovering
    const time = this._capturedTime ?? (params as { axisValue: string }[])[0]?.axisValue;
    if (time === undefined) return '';

    const index = data.times.indexOf(time);
    if (index < 0) return '';

    const decision = (value: number) => {
      if (!value) return '—';
      const color = value > 0 ? BUY_COLOR : SELL_COLOR;
      return `<span style="color:${color}">${value > 0 ? 'buy' : 'sell'} ${Math.abs(value).toFixed(2)}</span>`;
    };

    return `
      <b>Time ${time}</b>${this._capturedTime === null ? '' : ' <span style="color:#e63946">(captured: ←/→ to move, Esc to release)</span>'}<br/>
      Buy rate: ${data.buyRates[index].toFixed(4)}<br/>
      Sell rate: ${data.sellRates[index].toFixed(4)}
      <table style="margin-top:4px">
        <tr>
          <td><b>Agent</b></td>
          <td style="padding-left:12px"><b>USD</b></td>
          <td style="padding-left:12px"><b>Gold</b></td>
          <td style="padding-left:12px"><b>Capital</b></td>
          <td style="padding-left:12px"><b>Decision</b></td>
        </tr>
        ${data.agentIds.map((agentId, agentIndex) => `
          <tr>
            <td>${colorDot(agentColor(agentIndex))}${agentId}</td>
            <td style="padding-left:12px">${data.usdAmounts.get(agentId)![index].toFixed(2)}</td>
            <td style="padding-left:12px">${data.goldAmounts.get(agentId)![index].toFixed(2)}</td>
            <td style="padding-left:12px">${data.capitals.get(agentId)![index].toFixed(2)}</td>
            <td style="padding-left:12px">${decision(data.decisions.get(agentId)![index])}</td>
          </tr>
        `).join('')}
      </table>
    `;
  }
}
