export class TestimonialResponseDto {
  id: string;
  name: string;
  title: string;
  rating: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(testimonial: {
    id: string;
    name: string;
    title: string;
    rating: number;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = testimonial.id;
    this.name = testimonial.name;
    this.title = testimonial.title;
    this.rating = testimonial.rating;
    this.content = testimonial.content;
    this.createdAt = testimonial.createdAt;
    this.updatedAt = testimonial.updatedAt;
  }
}
