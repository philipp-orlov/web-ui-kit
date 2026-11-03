import { Pipe, PipeTransform } from '@angular/core';
import { formatBinarySize } from '@ui-kit/core/format';

/** `{{ sizeMib | binarySize }}`: a size in MiB as KiB, MiB, GiB or TiB (formatBinarySize of @ui-kit/core/format). */
@Pipe({ name: 'binarySize' })
export class BinarySizePipe implements PipeTransform {
  transform(valueMib: number | null | undefined): string {
    return formatBinarySize(valueMib ?? 0);
  }
}
