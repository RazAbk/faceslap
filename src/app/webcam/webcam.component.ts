import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as faceapi from 'face-api.js';
import { FaceMatcher, LabeledFaceDescriptors, WithFaceDescriptor, WithFaceDetection } from 'face-api.js';

@Component({
  selector: 'app-webcam',
  templateUrl: './webcam.component.html',
  styleUrls: ['./webcam.component.scss']
})
export class WebcamComponent implements OnInit {
  WIDTH = 440;
  HEIGHT = 280;

  DB_KEY = 'people_DB'

  @ViewChild('video', { static: true })
  public video!: ElementRef;

  @ViewChild('canvas', { static: true })
  public canvasRef!: ElementRef;

  @ViewChild('imageCaptureCanvas', { static: true })
  public imageCaptureCanvas!: ElementRef;

  constructor(private elRef: ElementRef) { }
  stream: any;
  currentSingleFaceDetection!: WithFaceDescriptor<any>;
  canvas: any;
  canvasEl: any;
  displaySize: any;
  videoInput!: HTMLVideoElement;
  faceMatcher!: FaceMatcher
  detectionInterval: any
  labeledFaceDescriptors: LabeledFaceDescriptors[] = []

  isNewPersonDetected = false

  async ngOnInit() {
    await Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri('../../assets/models'),
    await faceapi.nets.faceLandmark68Net.loadFromUri('../../assets/models'),
    await faceapi.nets.faceRecognitionNet.loadFromUri('../../assets/models'),
    await faceapi.nets.faceExpressionNet.loadFromUri('../../assets/models'),]).then(async () => {
      this.startVideo()
      this.labeledFaceDescriptors = await this._createDb();
      this.detect_Faces();
    })
  }

  async startVideo() {
    this.videoInput = this.video.nativeElement;
    const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    this.videoInput.srcObject = stream
  }

  async detect_Faces() {
    this.elRef.nativeElement.querySelector('video').addEventListener('play', async () => {
      this.canvas = await faceapi.createCanvasFromMedia(this.videoInput);
      this.canvasEl = this.canvasRef.nativeElement;
      this.canvasEl.appendChild(this.canvas);
      this.canvas.setAttribute('id', 'canvas');
      this.canvas.setAttribute(
        'style', `position: absolute;
        top: calc(50% - 150px);
        left: 0;`
      );

      this.displaySize = {
        width: this.videoInput.width,
        height: this.videoInput.height,
      };

      faceapi.matchDimensions(this.canvas, this.displaySize);

      // Create the faceMatcher according to the people DB
      this.faceMatcher = new faceapi.FaceMatcher(this.labeledFaceDescriptors)

      this.detectionInterval = setInterval(async () => {
        // Detect face
        this.currentSingleFaceDetection = await faceapi.detectSingleFace(this.videoInput, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

        if (this.currentSingleFaceDetection && this.faceMatcher) {
          // Resize the detection square for drawing on canvas according to display size of video
          this.currentSingleFaceDetection = faceapi.resizeResults(
            this.currentSingleFaceDetection,
            this.displaySize
          );

          // Match face detection results with db
          const detectionResult = this.faceMatcher.findBestMatch(this.currentSingleFaceDetection.descriptor)



          // Clear canvas
          this.canvas.getContext('2d').clearRect(0, 0, this.canvas.width, this.canvas.height);

          // Draw detection square on canvas
          const drawBox = new faceapi.draw.DrawBox(this.currentSingleFaceDetection.detection.box)
          drawBox.options.label = detectionResult.label
          drawBox.draw(this.canvas)

          // Unrecognized face
          if (detectionResult.label === 'unknown') {
            this.isNewPersonDetected = true

            const newPersonName = prompt('Enter a name:')

            if (newPersonName) {
              this.addNewPerson(newPersonName as string)
            }

          } else {
            this.isNewPersonDetected = false
          }

        }

      }, 500);
    });
  }

  addNewPerson(name: string) {
    console.log('person name is:', name);
    const canvas = this.imageCaptureCanvas.nativeElement;
    const context = canvas.getContext('2d');
    context.drawImage(this.videoInput, 0, 0, this.WIDTH, this.HEIGHT)
    const data = canvas.toDataURL('image/png');

    console.log(data);

    // this.videoInput.

  }

  async _createDb() {
    let DB: any = JSON.parse(localStorage.getItem(this.DB_KEY) as any)

    if (!DB) {
      const labeledFaceDescriptor = {
        "name": "raz",
        "dataURL": "data:image/png;base64,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"
      }

      localStorage.setItem(this.DB_KEY, JSON.stringify([labeledFaceDescriptor]))
      DB = [labeledFaceDescriptor]
    }

    // const people = ['raz', 'elon']
    const people = DB

    const labeledFaceDescriptors: LabeledFaceDescriptors[] = []

    people.forEach(async (person: any) => {
      // const canvas: HTMLCanvasElement = this.imageCaptureCanvas.nativeElement;
      // const context = canvas.getContext('2d');
      // context?.drawImage(this.videoInput, 0, 0, this.WIDTH, this.HEIGHT)
      // const data: any = canvas.toDataURL('image/jpeg');
      // const img: any = await this.getImage(data)

      // const img: any = await faceapi.fetchImage(`../../assets/images/${person.name}.jpg`);

      // TODO: Use a real image to be uploaded from cloudinary or some sort of service
      const img: any = await faceapi.fetchImage(`https://scontent.fsdv1-2.fna.fbcdn.net/v/t39.30808-6/270093968_4950578684985481_158042386832456581_n.jpg?_nc_cat=100&ccb=1-7&_nc_sid=09cbfe&_nc_ohc=pOvlV4WloI4AX8XMyhA&_nc_ht=scontent.fsdv1-2.fna&oh=00_AT_o5py_NB1u_zEZvraxLFjORM11_WbKMgYSXqjyZ91K8A&oe=62D7B401`);

      const fullFaceDescription: any = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

      if (!fullFaceDescription) {
        throw new Error(`no faces detected for ${person.name}`);
      }

      const labeledFaceDescriptor = new faceapi.LabeledFaceDescriptors(person.name, [fullFaceDescription.descriptor]);

      labeledFaceDescriptors.push(labeledFaceDescriptor);
    })

    return Promise.resolve(labeledFaceDescriptors)
  }

  async getImage(data: any) {
    const imgEl = document.createElement('img')
    imgEl.setAttribute('src', data)
    return Promise.resolve(imgEl)
  }
}
