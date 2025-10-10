
// This is a mock service. In a real application, this would involve
// server-side logic to fetch a URL or parse a file (PDF, DOCX, etc.).

const MOCK_SCRUM_GUIDE_TEXT = `
Scrum Guide
The Definitive Guide to Scrum: The Rules of the Game
November 2020

Purpose of the Scrum Guide
We developed Scrum in the early 1990s. We wrote the first version of the Scrum Guide in 2010 to help people worldwide understand Scrum. We have evolved the Guide since then through small, functional updates. Together, we stand behind it.

The Scrum Guide contains the definition of Scrum. Each element of the framework serves a specific purpose that is essential to the overall value and results realized with Scrum. Changing the core design or ideas of Scrum, leaving out elements, or not following the rules of Scrum, covers up problems and limits the benefits of Scrum, potentially even rendering it useless.

We follow the growing use of Scrum within an ever-increasingly complex world. We are humbled to see Scrum being adopted in many domains holding essentially complex work, beyond software product development where Scrum has its roots. As Scrum’s use spreads, developers, researchers, analysts, scientists, and other specialists do the work. We use the word “Developers” in Scrum not to exclude, but to simplify. If you get value from Scrum, consider yourself included.

As Scrum is being used, patterns, processes, and insights that fit the Scrum framework as described in this document, may be found, applied and devised. Their description is beyond the purpose of the Scrum Guide because they are context-sensitive and differ widely between Scrum uses. Such tactics for using within the Scrum framework vary and are described elsewhere.

© 2020 Ken Schwaber and Jeff Sutherland
This publication is offered for license under the Attribution Share-Alike license of Creative Commons, accessible at https://creativecommons.org/licenses/by-sa/4.0/legalcode and also described in summary form at https://creativecommons.org/licenses/by-sa/4.0/. By utilizing this Scrum Guide, you acknowledge and agree that you have read and agree to be bound by the terms of the Attribution Share-Alike license of Creative Commons.

Scrum Definition
Scrum is a lightweight framework that helps people, teams and organizations generate value through adaptive solutions for complex problems.

In a nutshell, Scrum requires a Scrum Master to foster an environment where:
1. A Product Owner orders the work for a complex problem into a Product Backlog.
2. The Scrum Team turns a selection of the work into an Increment of value during a Sprint.
3. The Scrum Team and its stakeholders inspect the results and adjust for the next Sprint.
4. Repeat

Scrum is simple. Try it as is and determine if its philosophy, theory, and structure help to achieve goals and create value. The Scrum framework is purposefully incomplete, only defining the parts required to implement Scrum theory. Scrum is built upon by the collective intelligence of the people using it. Rather than provide people with detailed instructions, the rules of Scrum guide their relationships and interactions.

Various processes, techniques and methods can be employed within the framework. Scrum wraps around existing practices or renders them unnecessary. Scrum makes visible the relative efficacy of current management, environment, and work techniques, so that improvements can be made.
`;


export const extractTextFromSource = (source: File | string): Promise<string> => {
    return new Promise((resolve) => {
      // Simulate network delay or file processing time
      setTimeout(() => {
        if (source instanceof File) {
          const reader = new FileReader();
          reader.onload = (e) => {
            // In a real app, you'd send the file to a server for parsing.
            // Here, we'll just use mock text for any uploaded file.
            resolve(`File content for "${source.name}" would be extracted here. For this demo, we are using a sample text about Scrum.\n\n` + MOCK_SCRUM_GUIDE_TEXT);
          };
          reader.onerror = () => resolve("Error reading file. Using mock text instead.\n\n" + MOCK_SCRUM_GUIDE_TEXT);
          reader.readAsText(source);
        } else {
          // If it's a URL, we'd fetch it on a server.
          // For this demo, we'll just return the mock text.
          resolve(`Content from URL "${source}" would be fetched and parsed here. For this demo, we are using a sample text about Scrum.\n\n` + MOCK_SCRUM_GUIDE_TEXT);
        }
      }, 1000);
    });
  };
