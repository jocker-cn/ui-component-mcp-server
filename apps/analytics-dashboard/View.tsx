import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { init, use, type ComposeOption, type EChartsType } from "echarts/core";
import { BarChart, LineChart, PieChart, type BarSeriesOption, type LineSeriesOption, type PieSeriesOption } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent, type GridComponentOption, type LegendComponentOption, type TooltipComponentOption } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { z } from "zod";
import type { AppViewProps } from "../../ui/view-props.js";
import type { analyticsDataset } from "./app.js";
import "./style.css";

use([BarChart, LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, SVGRenderer]);

type Dataset = z.output<typeof analyticsDataset>;
type ChartOption = ComposeOption<
  BarSeriesOption | LineSeriesOption | PieSeriesOption |
  GridComponentOption | LegendComponentOption | TooltipComponentOption
>;

const sample: Dataset = {
  trend: [
    { period: "1月", revenue: 128400 },
    { period: "2月", revenue: 154600 },
    { period: "3月", revenue: 143200 },
    { period: "4月", revenue: 182500 },
    { period: "5月", revenue: 196800 },
    { period: "6月", revenue: 231500 },
  ],
  regions: [
    { name: "华东", orders: 486 },
    { name: "华南", orders: 354 },
    { name: "华北", orders: 271 },
    { name: "西南", orders: 162 },
    { name: "其他", orders: 92 },
  ],
  channels: [
    { name: "直营", orders: 540 },
    { name: "电商", orders: 420 },
    { name: "合作伙伴", orders: 240 },
    { name: "其他", orders: 165 },
  ],
};

const currency = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});
const integer = new Intl.NumberFormat("zh-CN");
const axisText = { color: "#526179", fontSize: 12 };
const gridLine = { lineStyle: { color: "#e9edf5" } };

function chartOptions(dataset: Dataset): [ChartOption, ChartOption, ChartOption] {
  const regions = [...dataset.regions].sort((a, b) => b.orders - a.orders);
  return [
    {
      color: ["#5145d6"],
      grid: { top: 14, right: 20, bottom: 31, left: 57 },
      tooltip: {
        trigger: "axis",
        renderMode: "richText",
        valueFormatter: (value) => currency.format(Number(value)),
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: dataset.trend.map(({ period }) => period),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { ...axisText, hideOverlap: true },
      },
      yAxis: {
        type: "value",
        axisLabel: { ...axisText, formatter: (value: number) => `${value / 10_000}万` },
        splitLine: gridLine,
      },
      series: [{
        name: "收入",
        type: "line",
        smooth: true,
        symbolSize: 8,
        lineStyle: { width: 3 },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(81, 69, 214, 0.25)" },
              { offset: 1, color: "rgba(81, 69, 214, 0.02)" },
            ],
          },
        },
        data: dataset.trend.map(({ revenue }) => revenue),
      }],
    },
    {
      color: ["#147f81"],
      grid: { top: 14, right: 22, bottom: 30, left: 85 },
      tooltip: { trigger: "axis", renderMode: "richText", axisPointer: { type: "shadow" } },
      xAxis: { type: "value", minInterval: 1, axisLabel: axisText, splitLine: gridLine },
      yAxis: {
        type: "category",
        inverse: true,
        data: regions.map(({ name }) => name),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { ...axisText, width: 69, overflow: "truncate" },
      },
      series: [{
        name: "订单",
        type: "bar",
        barMaxWidth: 22,
        itemStyle: { borderRadius: [0, 5, 5, 0] },
        data: regions.map(({ orders }) => orders),
      }],
    },
    {
      color: ["#5145d6", "#147f81", "#4385dc", "#dd943c", "#bf6395", "#637a96", "#6c9d58", "#9b7bd3"],
      tooltip: { trigger: "item", renderMode: "richText", formatter: "{b}  {c} 单 ({d}%)" },
      legend: { bottom: 5, icon: "circle", itemWidth: 8, itemHeight: 8, textStyle: axisText },
      series: [{
        name: "渠道订单",
        type: "pie",
        center: ["50%", "43%"],
        radius: ["47%", "69%"],
        stillShowZeroSum: false,
        label: { show: false },
        itemStyle: { borderColor: "#fff", borderWidth: 2, borderRadius: 5 },
        data: dataset.channels.map(({ name, orders }) => ({ name, value: orders })),
      }],
    },
  ];
}

function Chart({ option, label }: { option: ChartOption; label: string }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<EChartsType>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    const instance = init(element, undefined, { renderer: "svg" });
    chart.current = instance;
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(element);

    return () => {
      observer.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, { notMerge: true });
  }, [option]);

  return <div className="analytics-chart" ref={container} role="img" aria-label={label} />;
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return <div className="analytics-metric"><dt>{label}</dt><dd>{children}</dd></div>;
}

export default function AnalyticsDashboard({ data, error, isPreview }: AppViewProps<{ dataset?: Dataset }>) {
  const dataset = data?.dataset ?? sample;
  const [trend, regions, channels] = useMemo(() => chartOptions(dataset), [dataset]);

  if (!data && !isPreview) {
    return <main className="analytics"><p role="status">{error ?? "正在加载经营数据…"}</p></main>;
  }

  return (
    <main className="analytics">
      <header className="analytics-header">
        <div>
          <p className="analytics-eyebrow">数据概览</p>
          <h1>经营分析看板</h1>
          <p className="analytics-subtitle">收入变化、订单区域分布和渠道构成</p>
        </div>
        {!data?.dataset && <span className="analytics-badge">示例数据</span>}
      </header>
      <dl className="analytics-metrics">
        <Metric label="周期总收入">{currency.format(dataset.trend.reduce((sum, item) => sum + item.revenue, 0))}</Metric>
        <Metric label="区域总订单">{integer.format(dataset.regions.reduce((sum, item) => sum + item.orders, 0))} 单</Metric>
        <Metric label="订单渠道">{integer.format(dataset.channels.length)} 个</Metric>
      </dl>
      <div className="analytics-grid">
        <section className="analytics-card analytics-trend">
          <h2>收入趋势</h2>
          <p>按周期查看收入变化</p>
          <Chart option={trend} label="收入趋势折线图" />
        </section>
        <section className="analytics-card">
          <h2>区域订单</h2>
          <p>按订单数量从高到低排列</p>
          <Chart option={regions} label="区域订单条形图" />
        </section>
        <section className="analytics-card">
          <h2>渠道构成</h2>
          <p>各渠道的订单占比</p>
          <Chart option={channels} label="渠道构成环形图" />
        </section>
      </div>
    </main>
  );
}
