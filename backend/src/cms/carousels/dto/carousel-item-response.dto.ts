export class CarouselItemResponseDto {
  id: string;
  sortOrder: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(item: {
    id: string;
    sortOrder: number;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = item.id;
    this.sortOrder = item.sortOrder;
    this.content = item.content;
    this.createdAt = item.createdAt;
    this.updatedAt = item.updatedAt;
  }
}
