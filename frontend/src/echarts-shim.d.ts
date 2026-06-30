/**
 * ECharts v6 类型声明
 * 解决 echarts v6 package.json exports 导致的类型解析问题
 */
declare module 'echarts' {
  namespace echarts {
    function init(dom: HTMLElement, theme?: string | object, opts?: object): ECharts;
    function registerMap(mapName: string, geoJSON: object, specialAreas?: object): void;
    interface ECharts {
      setOption(option: object, notMerge?: boolean, lazyUpdate?: boolean): void;
      getOption(): object;
      resize(opts?: object): void;
      dispose(): void;
      on(eventName: string, handler: Function): void;
      off(eventName: string, handler?: Function): void;
      showLoading(type?: string, opts?: object): void;
      hideLoading(): void;
      clear(): void;
      isDisposed(): boolean;
      getDataURL(opts: object): string;
    }
  }
  export = echarts;
}
