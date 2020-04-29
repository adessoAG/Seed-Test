import { Component, OnInit, DoCheck } from '@angular/core';
import {ApiService} from './Services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, DoCheck {
  token: string;
  githubName: string;
  title = 'cucumber-frontend';
  repositories: string[] = [];
  repository: string;
  showImpressum: boolean = false;
  showTerms: boolean = false;

  constructor(public apiService: ApiService, public router: Router) {
  }

  ngOnInit() {
    this.refreshLoginData();
    if(!this.apiService.urlReceived) {
      this.apiService.getBackendInfo()
    }
  }

  openTerms(){
    this.showImpressum = false;
    this.showTerms = !this.showTerms;
    if(this.showTerms) {
      const footer: HTMLElement = document.getElementById('footer');
      footer.scrollIntoView();
    }
  }

  openImpressum(){
    this.showTerms = false;
    this.showImpressum = !this.showImpressum;
    if(this.showImpressum) {
      const footer: HTMLElement = document.getElementById('footer');
      footer.scrollIntoView();
    }
  }

  refreshLoginData() {
    this.token = localStorage.getItem('token');
    this.githubName = localStorage.getItem('githubName');
    this.repository = localStorage.getItem('repository');

    if (this.token && this.githubName) {
      this.getRepositories();
    }
  }

  ngDoCheck() {
    const newToken = localStorage.getItem('token');
    const newGithubName = localStorage.getItem('githubName');
    const newRepository = localStorage.getItem('repository');
    if (newToken != this.token || newGithubName != this.githubName || newRepository != this.repository) {
      this.refreshLoginData();
    }
  }

  getRepositories() {
    this.token = localStorage.getItem('token');
    this.githubName = localStorage.getItem('githubName');
    this.apiService.getBackendUrlEvent.subscribe(() => {
      this.apiService.getRepositories(this.token, this.githubName).subscribe((resp: any) => {
        this.repositories = resp;
        console.log(resp);
      });
    });
  }


  selectRepository(repository: string) {
    const ref: HTMLLinkElement = document.getElementById('githubHref') as HTMLLinkElement;
    ref.href = 'https://github.com/' + repository;
    localStorage.setItem('repository', repository);
    this.repository = repository;
    this.apiService.getStories(repository, this.token).subscribe(resp => {
    });
  }

  logout() {
    localStorage.removeItem('repository');
    localStorage.removeItem('token');
    localStorage.removeItem('githubName');
    this.router.navigate(['/login']);
  }
}