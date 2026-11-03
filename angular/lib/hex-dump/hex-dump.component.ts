import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, viewChild } from '@angular/core';
import {
  BYTES_PER_ROW,
  HexRegion,
  HexSelection,
  hexByte,
  hexChar,
  hexInSelection,
  hexRegionAt,
  hexRowCount,
  hexRowOffset,
  hexTitle,
} from '@ui-kit/core/hex';

/** A hex dump with an ASCII column, regions in colour and one highlighted range; only the visible rows are drawn. */
@Component({
  selector: 'ui-hex-dump',
  imports: [ScrollingModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hex-dump.component.html',
  styleUrl: './hex-dump.component.scss',
})
export class HexDumpComponent {
  readonly bytes = input.required<Uint8Array>();
  readonly regions = input<HexRegion[]>([]);
  readonly highlight = input<HexSelection | null>(null);
  /** Added to the offsets shown (the page's place in the file). */
  readonly base = input(0);
  readonly pick = output<number>();
  private readonly viewport = viewChild(CdkVirtualScrollViewport);

  constructor() {
    // the range that is highlighted is brought into view
    effect(() => {
      const range = this.highlight();
      const viewport = this.viewport();
      if (range && viewport) {
        queueMicrotask(() => viewport.scrollToIndex(Math.max(0, Math.floor(range.from / BYTES_PER_ROW) - 2), 'smooth'));
      }
    });
  }

  protected readonly rowCount = computed(() => hexRowCount(this.bytes().length));
  protected readonly rowIndexes = computed(() => Array.from({ length: this.rowCount() }, (_, i) => i));
  protected readonly columns = Array.from({ length: BYTES_PER_ROW }, (_, i) => i);

  private at(row: number, column: number): number {
    return row * BYTES_PER_ROW + column;
  }

  protected rowOffset(row: number): string {
    return hexRowOffset(row, this.base());
  }

  protected hexAt(row: number, column: number): string {
    return hexByte(this.bytes(), this.at(row, column));
  }

  protected charAt(row: number, column: number): string {
    return hexChar(this.bytes(), this.at(row, column));
  }

  protected colorAt(row: number, column: number): string | null {
    return hexRegionAt(this.regions(), this.at(row, column))?.color ?? null;
  }

  /** The offset counts from `base`, as the row offsets do (it did not). */
  protected titleAt(row: number, column: number): string {
    return hexTitle(this.regions(), this.at(row, column), this.base());
  }

  protected highlighted(row: number, column: number): boolean {
    return hexInSelection(this.highlight(), this.at(row, column));
  }

  /** The padding of the last row is no byte: a click there picked an offset past the end. */
  protected onPick(row: number, column: number): void {
    const i = this.at(row, column);
    if (i < this.bytes().length) {
      this.pick.emit(i);
    }
  }
}
